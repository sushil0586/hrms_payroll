"""Static launch blueprint definitions for platform-led tenant setup."""

from __future__ import annotations

from dataclasses import dataclass, field


PLAN_ORDER = {
    "starter": 1,
    "growth": 2,
    "enterprise": 3,
}


@dataclass(frozen=True)
class LaunchModule:
    ref: str
    label: str
    minimum_plan: str = "starter"
    ownership_mode: str = "customer_owned"
    required_inputs: tuple[str, ...] = field(default_factory=tuple)
    child_seeder: str = ""
    description: str = ""

    def as_dict(self) -> dict:
        return {
            "ref": self.ref,
            "label": self.label,
            "minimum_plan": self.minimum_plan,
            "ownership_mode": self.ownership_mode,
            "required_inputs": list(self.required_inputs),
            "child_seeder": self.child_seeder,
            "description": self.description,
        }


@dataclass(frozen=True)
class LaunchBlueprint:
    ref: str
    version: str
    label: str
    country_code: str
    industry_refs: tuple[str, ...]
    minimum_plan: str
    compatible_plans: tuple[str, ...]
    workforce_model: str
    payroll_scope: str
    summary: str
    modules: tuple[LaunchModule, ...]
    required_inputs: tuple[str, ...] = field(default_factory=tuple)
    recommended_for: tuple[str, ...] = field(default_factory=tuple)

    def as_dict(self) -> dict:
        return {
            "ref": self.ref,
            "version": self.version,
            "label": self.label,
            "country_code": self.country_code,
            "industry_refs": list(self.industry_refs),
            "minimum_plan": self.minimum_plan,
            "compatible_plans": list(self.compatible_plans),
            "workforce_model": self.workforce_model,
            "payroll_scope": self.payroll_scope,
            "summary": self.summary,
            "required_inputs": list(self.required_inputs),
            "recommended_for": list(self.recommended_for),
            "modules": [module.as_dict() for module in self.modules],
        }


CORE_MODULES = (
    LaunchModule(
        ref="tenant_identity",
        label="Tenant Identity",
        ownership_mode="platform_managed",
        required_inputs=("legal_name", "registered_address", "primary_contact"),
        child_seeder="seed_tenant_identity",
        description="Company identity, country context, timezone, and platform handoff metadata.",
    ),
    LaunchModule(
        ref="roles_users",
        label="Roles and Users",
        ownership_mode="platform_managed",
        required_inputs=("tenant_admin_contact",),
        child_seeder="seed_roles_users",
        description="Tenant Admin, HR Admin, Payroll Admin, Manager, Finance, Auditor, and Employee defaults.",
    ),
    LaunchModule(
        ref="org_masters",
        label="Organization Masters",
        ownership_mode="customer_owned",
        required_inputs=("legal_entity", "default_branch", "default_department"),
        child_seeder="seed_org_masters",
        description="Legal entity, branch, department, cost center, grade, designation, and employment type defaults.",
    ),
    LaunchModule(
        ref="documents",
        label="Document Requirements",
        ownership_mode="customer_owned",
        child_seeder="seed_documents",
        description="India onboarding document categories and verification requirements.",
    ),
    LaunchModule(
        ref="workflows",
        label="Approval Workflows",
        ownership_mode="customer_owned",
        child_seeder="seed_workflows",
        description="Default HR, leave, attendance, payroll, and document approval chains.",
    ),
    LaunchModule(
        ref="notifications",
        label="Notification Templates",
        ownership_mode="platform_managed",
        child_seeder="seed_notifications",
        description="Production-ready invite, approval, reminder, payroll, and launch readiness messages.",
    ),
    LaunchModule(
        ref="launch_checklist",
        label="Launch Checklist",
        ownership_mode="platform_managed",
        child_seeder="seed_launch_checklist",
        description="Readiness checkpoints and evidence requirements for tenant handoff.",
    ),
)


PAYROLL_MODULES = (
    LaunchModule(
        ref="payroll_defaults",
        label="Payroll Defaults",
        minimum_plan="growth",
        ownership_mode="customer_owned",
        required_inputs=("pay_frequency", "salary_structure_style", "financial_year"),
        child_seeder="seed_payroll_defaults",
        description=(
            "India payroll calendars, pay groups, salary components, statutory placeholders, "
            "and finance handoff defaults."
        ),
    ),
    LaunchModule(
        ref="provider_placeholders",
        label="Provider Placeholders",
        minimum_plan="growth",
        ownership_mode="platform_locked",
        required_inputs=("provider_strategy",),
        child_seeder="seed_provider_placeholders",
        description="Provider connection placeholders that require real credentials before production payroll.",
    ),
)


ATTENDANCE_MODULES = (
    LaunchModule(
        ref="leave_attendance",
        label="Leave and Attendance",
        ownership_mode="customer_owned",
        required_inputs=("work_week", "holiday_region"),
        child_seeder="seed_leave_attendance",
        description="India leave types, holidays, attendance policy, shifts, and regularization defaults.",
    ),
)


SHIFT_MODULES = (
    LaunchModule(
        ref="shift_attendance",
        label="Shift Attendance",
        minimum_plan="growth",
        ownership_mode="customer_owned",
        required_inputs=("shift_patterns", "weekly_off_policy"),
        child_seeder="seed_leave_attendance",
        description="Shift patterns, roster policy, overtime readiness, and late/early rules.",
    ),
)


BLUEPRINTS = (
    LaunchBlueprint(
        ref="india-standard-sme",
        version="v1",
        label="India Standard SME",
        country_code="IN",
        industry_refs=("general", "technology", "professional_services"),
        minimum_plan="starter",
        compatible_plans=("starter", "growth", "enterprise"),
        workforce_model="office",
        payroll_scope="hrms_with_optional_payroll",
        summary="Default Indian office setup for small and mid-sized companies.",
        required_inputs=("legal_name", "registered_address", "tenant_admin_contact", "work_week", "holiday_region"),
        recommended_for=("Office teams", "SaaS companies", "Professional teams"),
        modules=CORE_MODULES + ATTENDANCE_MODULES + PAYROLL_MODULES,
    ),
    LaunchBlueprint(
        ref="india-services-company",
        version="v1",
        label="India Services Company",
        country_code="IN",
        industry_refs=("professional_services", "consulting", "technology_services"),
        minimum_plan="growth",
        compatible_plans=("growth", "enterprise"),
        workforce_model="project_services",
        payroll_scope="hrms_payroll_finance_handoff",
        summary="India template for service companies with project teams, billable departments, and payroll handoff.",
        required_inputs=(
            "legal_name",
            "registered_address",
            "tenant_admin_contact",
            "cost_center_strategy",
            "pay_frequency",
        ),
        recommended_for=("Consulting firms", "IT services", "Agencies"),
        modules=CORE_MODULES + ATTENDANCE_MODULES + PAYROLL_MODULES,
    ),
    LaunchBlueprint(
        ref="india-retail-shift-workforce",
        version="v1",
        label="India Retail Shift Workforce",
        country_code="IN",
        industry_refs=("retail", "field_sales", "hospitality"),
        minimum_plan="growth",
        compatible_plans=("growth", "enterprise"),
        workforce_model="shift_field",
        payroll_scope="hrms_payroll_shift_attendance",
        summary="India retail and field workforce setup with shift attendance and location-aware policies.",
        required_inputs=(
            "legal_name",
            "registered_address",
            "tenant_admin_contact",
            "shift_patterns",
            "holiday_region",
        ),
        recommended_for=("Retail chains", "Field teams", "Hospitality operations"),
        modules=CORE_MODULES + SHIFT_MODULES + PAYROLL_MODULES,
    ),
    LaunchBlueprint(
        ref="india-manufacturing-factory",
        version="v1",
        label="India Manufacturing Factory",
        country_code="IN",
        industry_refs=("manufacturing", "factory", "industrial"),
        minimum_plan="enterprise",
        compatible_plans=("enterprise",),
        workforce_model="factory_shift",
        payroll_scope="hrms_payroll_compliance_heavy",
        summary="India factory workforce setup with shifts, statutory evidence, and tighter platform controls.",
        required_inputs=(
            "legal_name",
            "factory_location",
            "statutory_registration_strategy",
            "shift_patterns",
            "weekly_off_policy",
        ),
        recommended_for=("Factories", "Plants", "Industrial employers"),
        modules=CORE_MODULES + SHIFT_MODULES + PAYROLL_MODULES,
    ),
    LaunchBlueprint(
        ref="india-hr-only",
        version="v1",
        label="India HR Only",
        country_code="IN",
        industry_refs=("general", "hr_only"),
        minimum_plan="starter",
        compatible_plans=("starter", "growth", "enterprise"),
        workforce_model="office",
        payroll_scope="hrms_only",
        summary="HRMS-first setup without payroll/provider execution.",
        required_inputs=("legal_name", "registered_address", "tenant_admin_contact", "work_week", "holiday_region"),
        recommended_for=("HR-only launch", "Payroll out of scope", "Pilot tenants"),
        modules=CORE_MODULES + ATTENDANCE_MODULES,
    ),
)
