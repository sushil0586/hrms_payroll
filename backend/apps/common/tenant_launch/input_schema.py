"""UI-friendly input definitions for tenant launch blueprints."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field


@dataclass(frozen=True)
class LaunchInputDefinition:
    key: str
    label: str
    group: str
    field_type: str
    help_text: str
    owner_role: str
    placeholder: str = ""
    example: str = ""
    required: bool = True
    sensitive: bool = False
    choices: tuple[dict, ...] = field(default_factory=tuple)

    def as_dict(self) -> dict:
        payload = asdict(self)
        payload["choices"] = list(self.choices)
        return payload


INPUT_DEFINITIONS = {
    "legal_name": LaunchInputDefinition(
        key="legal_name",
        label="Legal company name",
        group="Company Details",
        field_type="text",
        help_text="Registered company name used in tenant identity and statutory setup.",
        owner_role="Platform Admin",
        placeholder="Acme India Private Limited",
        example="Acme India Private Limited",
    ),
    "registered_address": LaunchInputDefinition(
        key="registered_address",
        label="Registered address",
        group="Company Details",
        field_type="multiline_text",
        help_text="Official registered address used for company profile and compliance readiness.",
        owner_role="Platform Admin",
        placeholder="Building, street, city, state, PIN",
    ),
    "primary_contact": LaunchInputDefinition(
        key="primary_contact",
        label="Primary contact",
        group="Admin Contact",
        field_type="email",
        help_text="Main customer contact for tenant launch coordination.",
        owner_role="Platform Admin",
        placeholder="admin@company.com",
        example="admin@company.com",
    ),
    "tenant_admin_contact": LaunchInputDefinition(
        key="tenant_admin_contact",
        label="Tenant admin contact",
        group="Admin Contact",
        field_type="email",
        help_text="First customer admin who will receive access and own tenant setup after handoff.",
        owner_role="Platform Admin",
        placeholder="admin@company.com",
        example="admin@company.com",
    ),
    "legal_entity": LaunchInputDefinition(
        key="legal_entity",
        label="Default legal entity",
        group="Organization Structure",
        field_type="text",
        help_text="Primary legal entity to use for starter organization defaults.",
        owner_role="Platform Admin",
        placeholder="Acme India Private Limited",
    ),
    "default_branch": LaunchInputDefinition(
        key="default_branch",
        label="Default branch",
        group="Organization Structure",
        field_type="text",
        help_text="Primary branch/location used for starter org and employee onboarding defaults.",
        owner_role="Platform Admin",
        placeholder="Bengaluru",
    ),
    "default_department": LaunchInputDefinition(
        key="default_department",
        label="Default department",
        group="Organization Structure",
        field_type="text",
        help_text="Fallback department used until the customer imports the full organization structure.",
        owner_role="HR Admin",
        placeholder="Operations",
    ),
    "cost_center_strategy": LaunchInputDefinition(
        key="cost_center_strategy",
        label="Cost center strategy",
        group="Organization Structure",
        field_type="select",
        help_text="How finance-facing departments and cost centers should be prepared.",
        owner_role="Finance",
        choices=(
            {"value": "department_based", "label": "Department based"},
            {"value": "project_based", "label": "Project based"},
            {"value": "manual_later", "label": "Customer will configure later"},
        ),
    ),
    "work_week": LaunchInputDefinition(
        key="work_week",
        label="Work week",
        group="Work Schedule",
        field_type="select",
        help_text="Default weekly working pattern for leave and attendance setup.",
        owner_role="HR Admin",
        choices=(
            {"value": "mon_fri", "label": "Monday to Friday"},
            {"value": "mon_sat", "label": "Monday to Saturday"},
            {"value": "custom", "label": "Custom"},
        ),
    ),
    "holiday_region": LaunchInputDefinition(
        key="holiday_region",
        label="Holiday region",
        group="Work Schedule",
        field_type="select",
        help_text="Indian holiday region used to prepare the initial holiday calendar.",
        owner_role="HR Admin",
        placeholder="KA",
        example="KA",
    ),
    "enable_maternity_leave": LaunchInputDefinition(
        key="enable_maternity_leave",
        label="Maternity leave",
        group="Leave Add-ons",
        field_type="checkbox",
        help_text="Add the statutory maternity leave template and default assignment during launch.",
        owner_role="HR Admin",
        required=False,
    ),
    "enable_paternity_leave": LaunchInputDefinition(
        key="enable_paternity_leave",
        label="Paternity leave",
        group="Leave Add-ons",
        field_type="checkbox",
        help_text="Add a configurable paternity leave template and default assignment.",
        owner_role="HR Admin",
        required=False,
    ),
    "enable_bereavement_leave": LaunchInputDefinition(
        key="enable_bereavement_leave",
        label="Bereavement leave",
        group="Leave Add-ons",
        field_type="checkbox",
        help_text="Add a bereavement leave template for compassionate leave requests.",
        owner_role="HR Admin",
        required=False,
    ),
    "enable_marriage_leave": LaunchInputDefinition(
        key="enable_marriage_leave",
        label="Marriage leave",
        group="Leave Add-ons",
        field_type="checkbox",
        help_text="Add a marriage leave template with evidence-ready configuration.",
        owner_role="HR Admin",
        required=False,
    ),
    "enable_comp_off_leave": LaunchInputDefinition(
        key="enable_comp_off_leave",
        label="Comp off leave",
        group="Leave Add-ons",
        field_type="checkbox",
        help_text="Add compensatory-off leave; HR still credits earned comp-off before employees consume it.",
        owner_role="HR Admin",
        required=False,
    ),
    "enable_jury_duty_leave": LaunchInputDefinition(
        key="enable_jury_duty_leave",
        label="Jury duty leave",
        group="Leave Add-ons",
        field_type="checkbox",
        help_text="Add an optional jury-duty template for global or future country-specific use.",
        owner_role="HR Admin",
        required=False,
    ),
    "shift_patterns": LaunchInputDefinition(
        key="shift_patterns",
        label="Shift patterns",
        group="Work Schedule",
        field_type="list",
        help_text="Common shift patterns needed for retail, field, factory, or support operations.",
        owner_role="HR Admin",
        placeholder="General, Morning, Evening, Night",
    ),
    "weekly_off_policy": LaunchInputDefinition(
        key="weekly_off_policy",
        label="Weekly off policy",
        group="Work Schedule",
        field_type="select",
        help_text="How weekly offs should be handled for shift and factory workforces.",
        owner_role="HR Admin",
        choices=(
            {"value": "fixed", "label": "Fixed weekly off"},
            {"value": "rotational", "label": "Rotational weekly off"},
            {"value": "custom", "label": "Custom"},
        ),
    ),
    "pay_frequency": LaunchInputDefinition(
        key="pay_frequency",
        label="Pay frequency",
        group="Payroll Setup",
        field_type="select",
        help_text="Payroll cycle to use for default pay groups and payroll calendars.",
        owner_role="Payroll Admin",
        choices=(
            {"value": "monthly", "label": "Monthly"},
            {"value": "semi_monthly", "label": "Semi-monthly"},
        ),
    ),
    "salary_structure_style": LaunchInputDefinition(
        key="salary_structure_style",
        label="Salary structure style",
        group="Payroll Setup",
        field_type="select",
        help_text="Starter salary structure style for payroll defaults.",
        owner_role="Payroll Admin",
        choices=(
            {"value": "simple_ctc", "label": "Simple CTC"},
            {"value": "allowance_based", "label": "Allowance based"},
            {"value": "customer_defined", "label": "Customer will define later"},
        ),
    ),
    "financial_year": LaunchInputDefinition(
        key="financial_year",
        label="Financial year",
        group="Payroll Setup",
        field_type="text",
        help_text="Indian financial year used for payroll, declarations, and reporting defaults.",
        owner_role="Payroll Admin",
        placeholder="2026-2027",
        example="2026-2027",
    ),
    "provider_strategy": LaunchInputDefinition(
        key="provider_strategy",
        label="Payroll provider strategy",
        group="Provider Setup",
        field_type="select",
        help_text="How payroll provider setup should be handled before production payroll.",
        owner_role="Platform Admin",
        sensitive=True,
        choices=(
            {"value": "none", "label": "No provider for now"},
            {"value": "platform_managed", "label": "Platform managed provider"},
            {"value": "customer_credentials", "label": "Customer will provide credentials"},
        ),
    ),
    "statutory_registration_strategy": LaunchInputDefinition(
        key="statutory_registration_strategy",
        label="Statutory registration strategy",
        group="Compliance Details",
        field_type="select",
        help_text="How PF, ESI, PT, and other employer registrations will be completed.",
        owner_role="Payroll Admin",
        sensitive=True,
        choices=(
            {"value": "collect_before_launch", "label": "Collect before launch"},
            {"value": "customer_managed", "label": "Customer managed"},
            {"value": "not_applicable", "label": "Not applicable"},
        ),
    ),
    "factory_location": LaunchInputDefinition(
        key="factory_location",
        label="Factory location",
        group="Company Details",
        field_type="text",
        help_text="Primary factory or plant location used for manufacturing launch readiness.",
        owner_role="Platform Admin",
        placeholder="Pune Plant",
    ),
}


def get_input_definition(key: str) -> LaunchInputDefinition | None:
    return INPUT_DEFINITIONS.get(key)


def serialize_input_definitions(keys: list[str] | tuple[str, ...] | set[str]) -> list[dict]:
    payload = []
    for key in sorted(keys):
        definition = get_input_definition(key)
        if definition:
            payload.append(definition.as_dict())
        else:
            payload.append(
                {
                    "key": key,
                    "label": key.replace("_", " ").title(),
                    "group": "Other",
                    "field_type": "text",
                    "help_text": "Required launch input.",
                    "owner_role": "Platform Admin",
                    "placeholder": "",
                    "example": "",
                    "required": True,
                    "sensitive": False,
                    "choices": [],
                }
            )
    return payload
