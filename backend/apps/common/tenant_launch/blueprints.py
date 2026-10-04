"""Static launch blueprint definitions for platform-led tenant setup."""

from __future__ import annotations

from dataclasses import dataclass, field, replace


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
    post_onboarding_owner: str = "Tenant Admin"
    editable_by_roles: tuple[str, ...] = field(default_factory=lambda: ("Tenant Admin",))
    customer_editable_after_handoff: bool = True
    required_inputs: tuple[str, ...] = field(default_factory=tuple)
    child_seeder: str = ""
    description: str = ""
    post_apply_action: str = ""

    def as_dict(self) -> dict:
        return {
            "ref": self.ref,
            "label": self.label,
            "minimum_plan": self.minimum_plan,
            "ownership_mode": self.ownership_mode,
            "post_onboarding_owner": self.post_onboarding_owner,
            "editable_by_roles": list(self.editable_by_roles),
            "customer_editable_after_handoff": self.customer_editable_after_handoff,
            "required_inputs": list(self.required_inputs),
            "child_seeder": self.child_seeder,
            "description": self.description,
            "post_apply_action": self.post_apply_action,
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
        post_onboarding_owner="Platform Admin",
        editable_by_roles=("Platform Admin",),
        customer_editable_after_handoff=False,
        required_inputs=("legal_name", "registered_address", "primary_contact"),
        child_seeder="seed_tenant_identity",
        description="Company identity, country context, timezone, and platform handoff metadata.",
        post_apply_action="Platform Admin verifies legal identity and records any legal-name changes through change control.",
    ),
    LaunchModule(
        ref="roles_users",
        label="Roles and Users",
        ownership_mode="platform_managed",
        post_onboarding_owner="Tenant Admin",
        editable_by_roles=("Platform Admin", "Tenant Admin"),
        customer_editable_after_handoff=True,
        required_inputs=("tenant_admin_contact",),
        child_seeder="seed_roles_users",
        description="Tenant Admin, HR Admin, Payroll Admin, Manager, Finance, Auditor, and Employee defaults.",
        post_apply_action="Tenant Admin invites real admins, reviews role membership, and removes any temporary launch access.",
    ),
    LaunchModule(
        ref="org_masters",
        label="Organization Masters",
        ownership_mode="customer_owned",
        post_onboarding_owner="HR Admin",
        editable_by_roles=("Tenant Admin", "HR Admin"),
        customer_editable_after_handoff=True,
        required_inputs=("legal_entity", "default_branch", "default_department"),
        child_seeder="seed_org_masters",
        description="Legal entity, branch, department, cost center, grade, designation, and employment type defaults.",
        post_apply_action="HR Admin adjusts departments, grades, locations, designations, and cost centers before employee import.",
    ),
    LaunchModule(
        ref="documents",
        label="Document Requirements",
        ownership_mode="customer_owned",
        post_onboarding_owner="HR Admin",
        editable_by_roles=("Tenant Admin", "HR Admin"),
        customer_editable_after_handoff=True,
        child_seeder="seed_documents",
        description="India onboarding document categories and verification requirements.",
        post_apply_action="HR Admin confirms required documents and collection rules before inviting employees.",
    ),
    LaunchModule(
        ref="workflows",
        label="Approval Workflows",
        ownership_mode="customer_owned",
        post_onboarding_owner="Tenant Admin",
        editable_by_roles=("Tenant Admin", "HR Admin", "Payroll Admin"),
        customer_editable_after_handoff=True,
        child_seeder="seed_workflows",
        description="Default HR, leave, attendance, payroll, and document approval chains.",
        post_apply_action="Tenant Admin assigns real approvers and tests approval routing before go-live.",
    ),
    LaunchModule(
        ref="notifications",
        label="Notification Templates",
        ownership_mode="platform_managed",
        post_onboarding_owner="Platform Admin",
        editable_by_roles=("Platform Admin",),
        customer_editable_after_handoff=False,
        child_seeder="seed_notifications",
        description="Production-ready invite, approval, reminder, payroll, and launch readiness messages.",
        post_apply_action="Platform Admin keeps templates versioned and verifies delivery settings in the target environment.",
    ),
    LaunchModule(
        ref="launch_checklist",
        label="Launch Checklist",
        ownership_mode="platform_managed",
        post_onboarding_owner="Platform Admin",
        editable_by_roles=("Platform Admin",),
        customer_editable_after_handoff=False,
        child_seeder="seed_launch_checklist",
        description="Readiness checkpoints and evidence requirements for tenant handoff.",
        post_apply_action="Platform Admin closes readiness evidence before customer handoff.",
    ),
)


PAYROLL_MODULES = (
    LaunchModule(
        ref="payroll_defaults",
        label="Payroll Defaults",
        minimum_plan="growth",
        ownership_mode="customer_owned",
        post_onboarding_owner="Payroll Admin",
        editable_by_roles=("Tenant Admin", "Payroll Admin", "Finance Admin"),
        customer_editable_after_handoff=True,
        required_inputs=("pay_frequency", "salary_structure_style", "financial_year"),
        child_seeder="seed_payroll_defaults",
        description=(
            "India payroll calendars, pay groups, salary components, statutory placeholders, "
            "and finance handoff defaults."
        ),
        post_apply_action="Payroll Admin validates pay groups, statutory registrations, salary structures, and employee payroll assignments before rehearsal.",
    ),
    LaunchModule(
        ref="provider_placeholders",
        label="Provider Placeholders",
        minimum_plan="growth",
        ownership_mode="platform_locked",
        post_onboarding_owner="Platform Admin",
        editable_by_roles=("Platform Admin",),
        customer_editable_after_handoff=False,
        required_inputs=("provider_strategy",),
        child_seeder="seed_provider_placeholders",
        description="Provider connection placeholders that require real credentials before production payroll.",
        post_apply_action="Platform Admin configures credentials, mappings, certification, and activation before live provider submissions.",
    ),
)


ATTENDANCE_MODULES = (
    LaunchModule(
        ref="leave_attendance",
        label="Leave and Attendance",
        ownership_mode="customer_owned",
        post_onboarding_owner="HR Admin",
        editable_by_roles=("Tenant Admin", "HR Admin"),
        customer_editable_after_handoff=True,
        required_inputs=("work_week", "holiday_region"),
        child_seeder="seed_leave_attendance",
        description="India leave types, holidays, attendance policy, shifts, and regularization defaults.",
        post_apply_action="HR Admin confirms leave policies, assignment scope, holidays, shifts, and attendance rules before employee rollout.",
    ),
)


SHIFT_MODULES = (
    LaunchModule(
        ref="shift_attendance",
        label="Shift Attendance",
        minimum_plan="growth",
        ownership_mode="customer_owned",
        post_onboarding_owner="HR Admin",
        editable_by_roles=("Tenant Admin", "HR Admin"),
        customer_editable_after_handoff=True,
        required_inputs=("shift_patterns", "weekly_off_policy"),
        child_seeder="seed_leave_attendance",
        description="Shift patterns, roster policy, overtime readiness, and late/early rules.",
        post_apply_action="HR Admin configures real shift patterns, roster ownership, overtime rules, and weekly-off exceptions.",
    ),
)


CORE_MODULES_V2 = tuple(
    replace(
        module,
        post_apply_action=(
            "HR Admin confirms document rules, expiry reminders, and employee upload guidance before inviting employees."
        ),
    )
    if module.ref == "documents"
    else replace(
        module,
        post_apply_action=(
            "Tenant Admin assigns real approvers, tests escalation routing, and records approval owners before go-live."
        ),
    )
    if module.ref == "workflows"
    else module
    for module in CORE_MODULES
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
        ref="india-standard-sme",
        version="v2",
        label="India Standard SME",
        country_code="IN",
        industry_refs=("general", "technology", "professional_services"),
        minimum_plan="starter",
        compatible_plans=("starter", "growth", "enterprise"),
        workforce_model="office",
        payroll_scope="hrms_with_optional_payroll",
        summary="Updated Indian office setup with stronger handoff guidance for documents and approval workflows.",
        required_inputs=("legal_name", "registered_address", "tenant_admin_contact", "work_week", "holiday_region"),
        recommended_for=("Office teams", "SaaS companies", "Professional teams"),
        modules=CORE_MODULES_V2 + ATTENDANCE_MODULES + PAYROLL_MODULES,
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
