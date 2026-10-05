"""Registry helpers for tenant launch blueprints."""

from __future__ import annotations

from apps.common.tenant_launch.input_schema import serialize_input_definitions
from apps.common.tenant_launch.blueprints import BLUEPRINTS, PLAN_ORDER, LaunchBlueprint
from apps.common.tenant_launch.seeders import SAFE_APPLY_MODULES


def list_blueprints() -> list[LaunchBlueprint]:
    return sorted(BLUEPRINTS, key=lambda blueprint: (blueprint.country_code, blueprint.minimum_plan, blueprint.label))


def get_blueprint(ref: str, version: str | None = None) -> LaunchBlueprint | None:
    ref = ref.strip()
    version = (version or "").strip()
    matches = [blueprint for blueprint in BLUEPRINTS if blueprint.ref == ref]
    if version:
        matches = [blueprint for blueprint in matches if blueprint.version == version]
    return matches[0] if matches else None


def plan_allows(required_plan: str, tenant_plan: str) -> bool:
    return PLAN_ORDER.get(tenant_plan, 0) >= PLAN_ORDER.get(required_plan, 0)


def blueprint_is_compatible(blueprint: LaunchBlueprint, *, country_code: str, subscription_plan: str) -> bool:
    if blueprint.country_code != country_code:
        return False
    return subscription_plan in blueprint.compatible_plans and plan_allows(blueprint.minimum_plan, subscription_plan)


def serialize_blueprint(blueprint: LaunchBlueprint, *, subscription_plan: str = "", country_code: str = "") -> dict:
    payload = blueprint.as_dict()
    input_keys = set(blueprint.required_inputs)
    module_payloads = []
    for module in blueprint.modules:
        input_keys.update(module.required_inputs)
        input_keys.update(module.optional_inputs)
        module_payload = module.as_dict()
        if subscription_plan:
            plan_allowed = plan_allows(module.minimum_plan, subscription_plan)
            module_payload.update(
                {
                    "tenant_plan": subscription_plan,
                    "plan_allowed": plan_allowed,
                    "safe_apply_enabled": module.ref in SAFE_APPLY_MODULES,
                    "apply_allowed": plan_allowed and module.ref in SAFE_APPLY_MODULES,
                    "gating_reason": "" if plan_allowed else f"Requires {module.minimum_plan.title()} plan.",
                }
            )
        module_payloads.append(module_payload)
    payload["modules"] = module_payloads
    payload["input_schema"] = serialize_input_definitions(input_keys)
    if subscription_plan or country_code:
        payload["compatibility"] = {
            "country_matches": not country_code or blueprint.country_code == country_code,
            "plan_allowed": not subscription_plan
            or (
                subscription_plan in blueprint.compatible_plans
                and plan_allows(blueprint.minimum_plan, subscription_plan)
            ),
            "included_module_count": len([module for module in module_payloads if module.get("plan_allowed", True)]),
            "plan_gated_module_count": len([module for module in module_payloads if module.get("plan_allowed") is False]),
            "safe_apply_module_count": len([module for module in module_payloads if module.get("apply_allowed") is True]),
        }
    return payload
