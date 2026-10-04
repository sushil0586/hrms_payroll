"""Pure preview planning for tenant launch blueprints."""

from __future__ import annotations

from dataclasses import asdict, dataclass

from apps.common.tenant_launch.input_schema import serialize_input_definitions
from apps.common.tenant_launch.registry import blueprint_is_compatible, get_blueprint, plan_allows
from apps.common.tenant_launch.seeders import SAFE_APPLY_MODULES
from apps.tenants.models import Tenant


OWNERSHIP_LABELS = {
    "platform_locked": "Platform locked",
    "platform_managed": "Platform managed",
    "customer_owned": "Customer editable",
    "delegated": "Delegated to customer role",
}


@dataclass(frozen=True)
class LaunchPreviewResult:
    can_apply: bool
    blueprint_ref: str
    blueprint_version: str
    tenant_code: str
    subscription_plan: str
    country_code: str
    planned_modules: tuple[dict, ...]
    skipped_modules: tuple[dict, ...]
    missing_inputs: tuple[str, ...]
    required_inputs: tuple[str, ...]
    input_schema: tuple[dict, ...]
    blockers: tuple[str, ...]
    warnings: tuple[str, ...]
    child_seeders: tuple[str, ...]
    safe_apply_modules: tuple[str, ...]
    plan_gated_modules: tuple[str, ...]
    uncertified_modules: tuple[str, ...]

    def as_dict(self) -> dict:
        return asdict(self)


def _planned_module_payload(module, *, missing_inputs: list[str], tenant_plan: str) -> dict:
    safe_apply_enabled = module.ref in SAFE_APPLY_MODULES
    action_needed = (
        "Provide the missing inputs before this section can be prepared."
        if missing_inputs
        else (
            "Certified for safe apply on this subscription."
            if safe_apply_enabled
            else "Planned for launch, but the child seeder is not certified for safe apply yet."
        )
    )
    return {
        **module.as_dict(),
        "title": module.label,
        "ui_status": "needs_input" if missing_inputs else "will_configure",
        "status_label": "Needs input" if missing_inputs else "Will configure",
        "action_label": "Review inputs" if missing_inputs else "Ready",
        "action_needed": action_needed,
        "editability_label": OWNERSHIP_LABELS.get(module.ownership_mode, module.ownership_mode),
        "missing_inputs": missing_inputs,
        "tenant_plan": tenant_plan,
        "plan_allowed": True,
        "safe_apply_enabled": safe_apply_enabled,
        "apply_allowed": safe_apply_enabled and not missing_inputs,
        "gating_reason": "" if safe_apply_enabled else "Seeder certification pending.",
    }


def _skipped_module_payload(module, *, missing_inputs: list[str], tenant_plan: str) -> dict:
    return {
        **module.as_dict(),
        "title": module.label,
        "ui_status": "skipped_by_plan",
        "status_label": "Skipped by subscription",
        "action_label": "Upgrade plan",
        "action_needed": f"Available on {module.minimum_plan.title()} and higher plans.",
        "editability_label": OWNERSHIP_LABELS.get(module.ownership_mode, module.ownership_mode),
        "missing_inputs": missing_inputs,
        "tenant_plan": tenant_plan,
        "plan_allowed": False,
        "safe_apply_enabled": module.ref in SAFE_APPLY_MODULES,
        "apply_allowed": False,
        "gating_reason": f"Requires {module.minimum_plan.title()} plan.",
        "skip_reason": (
            f"{module.label} is available on {module.minimum_plan.title()} plan. "
            f"Current plan is {tenant_plan.title()}."
        ),
    }


def build_launch_preview(
    *,
    tenant: Tenant,
    blueprint_ref: str,
    blueprint_version: str | None = None,
    input_payload: dict | None = None,
) -> LaunchPreviewResult:
    blueprint = get_blueprint(blueprint_ref, blueprint_version)
    if blueprint is None:
        return LaunchPreviewResult(
            can_apply=False,
            blueprint_ref=blueprint_ref,
            blueprint_version=blueprint_version or "",
            tenant_code=tenant.code,
            subscription_plan=tenant.subscription_plan,
            country_code=tenant.country_code,
            planned_modules=(),
            skipped_modules=(),
            missing_inputs=(),
            required_inputs=(),
            input_schema=(),
            blockers=("Blueprint is not registered.",),
            warnings=(),
            child_seeders=(),
            safe_apply_modules=(),
            plan_gated_modules=(),
            uncertified_modules=(),
        )

    provided_inputs = set((input_payload or {}).keys())
    blueprint_required_inputs = set(blueprint.required_inputs)
    required_inputs = set(blueprint.required_inputs)
    all_input_keys = set(blueprint.required_inputs)
    planned_modules: list[dict] = []
    skipped_modules: list[dict] = []
    child_seeders: list[str] = []
    safe_apply_modules: list[str] = []
    plan_gated_modules: list[str] = []
    uncertified_modules: list[str] = []
    missing_inputs = required_inputs - provided_inputs
    blockers: list[str] = []
    warnings: list[str] = []

    if tenant.country_code != blueprint.country_code:
        blockers.append(
            f"Blueprint country {blueprint.country_code} does not match tenant country {tenant.country_code}."
        )
    if (
        not plan_allows(blueprint.minimum_plan, tenant.subscription_plan)
        or tenant.subscription_plan not in blueprint.compatible_plans
    ):
        blockers.append(f"Blueprint requires one of {', '.join(blueprint.compatible_plans)} plans.")

    for module in blueprint.modules:
        all_input_keys.update(module.required_inputs)
        module_missing_inputs = sorted(set(module.required_inputs) - provided_inputs)
        if plan_allows(module.minimum_plan, tenant.subscription_plan):
            planned_payload = _planned_module_payload(
                module,
                missing_inputs=module_missing_inputs,
                tenant_plan=tenant.subscription_plan,
            )
            planned_modules.append(planned_payload)
            if module.child_seeder:
                child_seeders.append(module.child_seeder)
            missing_inputs.update(module_missing_inputs)
            if planned_payload["apply_allowed"]:
                safe_apply_modules.append(module.ref)
            elif module.ref not in SAFE_APPLY_MODULES:
                uncertified_modules.append(module.ref)
        else:
            plan_gated_modules.append(module.ref)
            skipped_modules.append(
                _skipped_module_payload(
                    module,
                    missing_inputs=module_missing_inputs,
                    tenant_plan=tenant.subscription_plan,
                )
            )

    if missing_inputs:
        warnings.append("Required customer inputs are missing before apply.")
    input_schema = tuple(serialize_input_definitions(all_input_keys))

    return LaunchPreviewResult(
        can_apply=not blockers and not missing_inputs and blueprint_is_compatible(
            blueprint,
            country_code=tenant.country_code,
            subscription_plan=tenant.subscription_plan,
        ),
        blueprint_ref=blueprint.ref,
        blueprint_version=blueprint.version,
        tenant_code=tenant.code,
        subscription_plan=tenant.subscription_plan,
        country_code=tenant.country_code,
        planned_modules=tuple(planned_modules),
        skipped_modules=tuple(skipped_modules),
        missing_inputs=tuple(sorted(missing_inputs)),
        required_inputs=tuple(sorted(blueprint_required_inputs)),
        input_schema=input_schema,
        blockers=tuple(blockers),
        warnings=tuple(warnings),
        child_seeders=tuple(dict.fromkeys(child_seeders)),
        safe_apply_modules=tuple(sorted(dict.fromkeys(safe_apply_modules))),
        plan_gated_modules=tuple(sorted(dict.fromkeys(plan_gated_modules))),
        uncertified_modules=tuple(sorted(dict.fromkeys(uncertified_modules))),
    )
