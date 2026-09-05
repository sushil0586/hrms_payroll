"""Safe payroll rule evaluation services."""

from __future__ import annotations

import ast
import csv
import json
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from io import StringIO
from typing import Any

from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone

from apps.payroll.models import (
    PayrollCalculationLine,
    PayrollCalculationLineSource,
    PayrollCalculationLineStatus,
    PayrollCalculationStatus,
    PayrollAdjustment,
    PayrollAdjustmentDirection,
    PayrollAdjustmentStatus,
    PayrollApprovalStatus,
    PayrollExceptionSeverity,
    PayrollExceptionStatus,
    PayrollFinanceHandoff,
    PayrollFinanceHandoffStatus,
    PayrollInputSnapshot,
    PayrollInputSnapshotStatus,
    PayrollOutputArtifact,
    PayrollOutputArtifactKind,
    PayrollOutputArtifactStatus,
    PayrollOutputBatch,
    PayrollOutputBatchStatus,
    PayrollReviewStatus,
    PayrollRuleVersion,
    PayrollRuleVersionStatus,
    PayrollRun,
    PayrollRunApproval,
    PayrollRunStatus,
    PayrollRunCalculation,
    PayrollRunException,
    PayrollRunReview,
    PayrollSettlement,
    PayrollSettlementLine,
    PayrollSettlementLineKind,
    PayrollSettlementStatus,
    PayrollValidationCategory,
    PayrollValidationIssue,
    PayrollValidationIssueStatus,
    PayrollValidationSeverity,
)


class PayrollRuleEvaluationError(ValueError):
    """Raised when a payroll rule expression cannot be evaluated safely."""


class PayrollCalculationError(ValueError):
    """Raised when a payroll run cannot be calculated from its locked inputs."""


class PayrollAdjustmentError(ValueError):
    """Raised when a payroll adjustment transition is not allowed."""


class PayrollSettlementError(ValueError):
    """Raised when a payroll settlement transition is not allowed."""


class PayrollReviewError(ValueError):
    """Raised when a payroll run review transition is not allowed."""


class PayrollOutputError(ValueError):
    """Raised when payroll outputs cannot be generated or published."""


class PayrollFinanceHandoffError(ValueError):
    """Raised when payroll finance handoff generation or transmission is not allowed."""


ARTIFACT_MIME_TYPES = {
    PayrollOutputArtifactKind.PAYSLIP: "text/html",
    PayrollOutputArtifactKind.REGISTER: "text/csv",
    PayrollOutputArtifactKind.BANK_ADVICE: "text/csv",
    PayrollOutputArtifactKind.ACCOUNTING_EXPORT: "text/csv",
    PayrollOutputArtifactKind.STATUTORY_REPORT: "text/csv",
}

ARTIFACT_FILE_EXTENSIONS = {
    "application/json": "json",
    "text/csv": "csv",
    "text/html": "html",
}


def _to_decimal(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if isinstance(value, bool) or value is None:
        raise PayrollRuleEvaluationError("Boolean and null values cannot be used as numbers.")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise PayrollRuleEvaluationError(f"Value {value!r} is not numeric.") from exc


def _json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    return value


def _normalized_key(value: str) -> str:
    normalized = "".join(character if character.isalnum() else "_" for character in str(value).lower()).strip("_")
    return normalized or "value"


def _round_decimal(value: Any, places: Any = 2) -> Decimal:
    numeric_value = _to_decimal(value)
    numeric_places = int(_to_decimal(places))
    quantizer = Decimal("1").scaleb(-numeric_places)
    return numeric_value.quantize(quantizer, rounding=ROUND_HALF_UP)


def _coalesce(*values: Any) -> Any:
    for value in values:
        if value is not None and value != "":
            return value
    return None


def _if_else(condition: Any, truthy: Any, falsey: Any) -> Any:
    return truthy if bool(condition) else falsey


def _cap_between(value: Any, minimum: Any, maximum: Any) -> Decimal:
    numeric_value = _to_decimal(value)
    return min(max(numeric_value, _to_decimal(minimum)), _to_decimal(maximum))


@dataclass
class PayrollRuleEvaluationResult:
    result: Any
    dependencies: list[str]
    trace: list[dict[str, Any]]

    def as_payload(self) -> dict[str, Any]:
        return {
            "result": _json_safe(self.result),
            "dependencies": self.dependencies,
            "trace": _json_safe(self.trace),
        }


class SafePayrollExpressionEvaluator:
    """Whitelisted expression evaluator for payroll formula and rule previews."""

    ALLOWED_FUNCTIONS = {
        "abs": lambda value: abs(_to_decimal(value)),
        "min": lambda *values: min(_to_decimal(value) for value in values),
        "max": lambda *values: max(_to_decimal(value) for value in values),
        "round_decimal": _round_decimal,
        "coalesce": _coalesce,
        "if_else": _if_else,
        "cap_between": _cap_between,
    }

    def __init__(self, context: dict[str, Any]):
        self.context = context
        self.dependencies: set[str] = set()
        self.trace: list[dict[str, Any]] = []

    def evaluate(self, expression: str) -> PayrollRuleEvaluationResult:
        try:
            tree = ast.parse(expression, mode="eval")
        except SyntaxError as exc:
            raise PayrollRuleEvaluationError("Expression syntax is invalid.") from exc
        result = self._eval(tree.body)
        return PayrollRuleEvaluationResult(
            result=result,
            dependencies=sorted(self.dependencies),
            trace=self.trace,
        )

    def _eval(self, node: ast.AST) -> Any:
        if isinstance(node, ast.Constant):
            if isinstance(node.value, float):
                return Decimal(str(node.value))
            return node.value

        if isinstance(node, ast.Name):
            if node.id not in self.context:
                raise PayrollRuleEvaluationError(f"Unknown input '{node.id}'.")
            self.dependencies.add(node.id)
            return self.context[node.id]

        if isinstance(node, ast.Attribute):
            value, path = self._resolve_path(node)
            self.dependencies.add(path)
            return value

        if isinstance(node, ast.UnaryOp):
            operand = self._eval(node.operand)
            if isinstance(node.op, ast.USub):
                return -_to_decimal(operand)
            if isinstance(node.op, ast.UAdd):
                return _to_decimal(operand)
            if isinstance(node.op, ast.Not):
                return not bool(operand)
            raise PayrollRuleEvaluationError("Unsupported unary operator.")

        if isinstance(node, ast.BinOp):
            left = self._eval(node.left)
            right = self._eval(node.right)
            result = self._eval_binop(node.op, left, right)
            self.trace.append({"operation": type(node.op).__name__, "left": _json_safe(left), "right": _json_safe(right), "result": _json_safe(result)})
            return result

        if isinstance(node, ast.BoolOp):
            values = [bool(self._eval(value)) for value in node.values]
            if isinstance(node.op, ast.And):
                return all(values)
            if isinstance(node.op, ast.Or):
                return any(values)
            raise PayrollRuleEvaluationError("Unsupported boolean operator.")

        if isinstance(node, ast.Compare):
            left = self._eval(node.left)
            for operator, comparator in zip(node.ops, node.comparators):
                right = self._eval(comparator)
                if not self._compare(operator, left, right):
                    return False
                left = right
            return True

        if isinstance(node, ast.IfExp):
            return self._eval(node.body) if bool(self._eval(node.test)) else self._eval(node.orelse)

        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise PayrollRuleEvaluationError("Only named helper functions are allowed; arbitrary calls are not allowed.")
            function_name = node.func.id
            if function_name not in self.ALLOWED_FUNCTIONS:
                raise PayrollRuleEvaluationError(f"Function '{function_name}' is not allowed.")
            if node.keywords:
                raise PayrollRuleEvaluationError("Keyword arguments are not supported.")
            args = [self._eval(arg) for arg in node.args]
            result = self.ALLOWED_FUNCTIONS[function_name](*args)
            self.trace.append({"function": function_name, "args": _json_safe(args), "result": _json_safe(result)})
            return result

        raise PayrollRuleEvaluationError(f"Unsupported expression element: {type(node).__name__}.")

    def _eval_binop(self, operator: ast.operator, left: Any, right: Any) -> Decimal:
        left_value = _to_decimal(left)
        right_value = _to_decimal(right)
        if isinstance(operator, ast.Add):
            return left_value + right_value
        if isinstance(operator, ast.Sub):
            return left_value - right_value
        if isinstance(operator, ast.Mult):
            return left_value * right_value
        if isinstance(operator, ast.Div):
            if right_value == 0:
                raise PayrollRuleEvaluationError("Division by zero is not allowed.")
            return left_value / right_value
        if isinstance(operator, ast.Mod):
            if right_value == 0:
                raise PayrollRuleEvaluationError("Modulo by zero is not allowed.")
            return left_value % right_value
        raise PayrollRuleEvaluationError("Unsupported arithmetic operator.")

    def _compare(self, operator: ast.cmpop, left: Any, right: Any) -> bool:
        if isinstance(operator, ast.Eq):
            return left == right
        if isinstance(operator, ast.NotEq):
            return left != right
        left_value = _to_decimal(left)
        right_value = _to_decimal(right)
        if isinstance(operator, ast.Lt):
            return left_value < right_value
        if isinstance(operator, ast.LtE):
            return left_value <= right_value
        if isinstance(operator, ast.Gt):
            return left_value > right_value
        if isinstance(operator, ast.GtE):
            return left_value >= right_value
        raise PayrollRuleEvaluationError("Unsupported comparison operator.")

    def _resolve_path(self, node: ast.Attribute) -> tuple[Any, str]:
        parts: list[str] = []
        current: ast.AST = node
        while isinstance(current, ast.Attribute):
            parts.append(current.attr)
            current = current.value
        if not isinstance(current, ast.Name):
            raise PayrollRuleEvaluationError("Only dotted input paths are allowed.")
        parts.append(current.id)
        path_parts = list(reversed(parts))
        value: Any = self.context
        traversed: list[str] = []
        for part in path_parts:
            traversed.append(part)
            if not isinstance(value, dict) or part not in value:
                raise PayrollRuleEvaluationError(f"Unknown input '{'.'.join(traversed)}'.")
            value = value[part]
        return value, ".".join(path_parts)


def build_payroll_rule_context_from_snapshot(snapshot: PayrollInputSnapshot) -> dict[str, Any]:
    """Build the namespaced formula context from a locked payroll input snapshot."""

    return {
        "employee": snapshot.employee_snapshot or {},
        "organization": snapshot.organization_snapshot or {},
        "salary": snapshot.salary_snapshot or {},
        "attendance": snapshot.attendance_snapshot or {},
        "leave": snapshot.leave_snapshot or {},
        "lifecycle": snapshot.lifecycle_snapshot or {},
        "document": snapshot.document_snapshot or {},
        "banking": snapshot.banking_snapshot or {},
        "validation": snapshot.validation_snapshot or {},
        "config": snapshot.config_snapshot or {},
    }


def evaluate_payroll_rule_version(
    rule_version: PayrollRuleVersion,
    *,
    context: dict[str, Any] | None = None,
    input_snapshot: PayrollInputSnapshot | None = None,
) -> PayrollRuleEvaluationResult:
    """Evaluate a rule version against explicit context or a payroll input snapshot."""

    if input_snapshot is not None:
        context = build_payroll_rule_context_from_snapshot(input_snapshot)
    if context is None:
        context = {}
    evaluator = SafePayrollExpressionEvaluator(context)
    return evaluator.evaluate(rule_version.expression)


def _config_for_rule_version(rule_version: PayrollRuleVersion) -> dict[str, Any]:
    config: dict[str, Any] = {}
    if isinstance(rule_version.rule.config_snapshot, dict):
        config.update(rule_version.rule.config_snapshot)
    if isinstance(rule_version.config_snapshot, dict):
        config.update(rule_version.config_snapshot)
    return config


def _calculation_order(rule_version: PayrollRuleVersion) -> int:
    config = _config_for_rule_version(rule_version)
    try:
        return int(config.get("calculation_order", 100))
    except (TypeError, ValueError):
        return 100


def _valid_context_path(path: str) -> bool:
    parts = [part for part in str(path or "").split(".") if part]
    return bool(parts) and all(part.isidentifier() for part in parts)


def _set_context_path(context: dict[str, Any], path: str, value: Any) -> None:
    if not _valid_context_path(path):
        return
    parts = path.split(".")
    current = context
    for part in parts[:-1]:
        next_value = current.get(part)
        if not isinstance(next_value, dict):
            next_value = {}
            current[part] = next_value
        current = next_value
    current[parts[-1]] = value


def _selected_rule_versions(payroll_run: PayrollRun) -> list[PayrollRuleVersion]:
    profile = payroll_run.config_snapshot.get("calculation_profile", {}) if isinstance(payroll_run.config_snapshot, dict) else {}
    selected_rule_codes = {str(value) for value in profile.get("rule_codes", []) if str(value)} if isinstance(profile, dict) else set()
    excluded_rule_codes = {str(value) for value in profile.get("excluded_rule_codes", []) if str(value)} if isinstance(profile, dict) else set()

    versions = PayrollRuleVersion.objects.filter(
        tenant=payroll_run.tenant,
        status=PayrollRuleVersionStatus.ACTIVE,
        effective_from__lte=payroll_run.period.end_date,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=payroll_run.period.start_date)).select_related("rule")
    if selected_rule_codes:
        versions = versions.filter(rule__code__in=selected_rule_codes)
    if excluded_rule_codes:
        versions = versions.exclude(rule__code__in=excluded_rule_codes)
    return sorted(versions, key=lambda item: (_calculation_order(item), item.rule.code, item.version))


def _line_type(rule_version: PayrollRuleVersion, config: dict[str, Any]) -> str:
    return str(config.get("line_type") or config.get("component_type") or rule_version.rule.rule_type)


def _component_code(rule_version: PayrollRuleVersion, config: dict[str, Any]) -> str:
    return str(config.get("component_code") or config.get("component_ref") or rule_version.rule.code)


def _component_name(rule_version: PayrollRuleVersion, config: dict[str, Any]) -> str:
    return str(config.get("component_name") or rule_version.rule.name)


def _currency_code(payroll_run: PayrollRun, config: dict[str, Any]) -> str:
    return str(
        config.get("currency_code")
        or (payroll_run.pay_group.default_currency_code if payroll_run.pay_group else "")
        or payroll_run.period.calendar.currency_code
        or "INR"
    )[:3]


def _apply_line_to_totals(totals: dict[str, Decimal], line_type: str, amount: Decimal) -> None:
    normalized_type = _normalized_key(line_type)
    if normalized_type in {"earning", "reimbursement"}:
        totals["gross_earnings"] += amount
        totals["net_pay"] += amount
    elif normalized_type in {"deduction", "tax"}:
        totals["employee_deductions"] += amount
        totals["net_pay"] -= amount
    elif normalized_type == "employer_contribution":
        totals["employer_contributions"] += amount


def _totals_payload(totals: dict[str, Decimal], *, employee_count: int, line_count: int, error_count: int) -> dict[str, Any]:
    payload = {key: str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) for key, value in totals.items()}
    payload.update({
        "employee_count": employee_count,
        "line_count": line_count,
        "error_count": error_count,
    })
    return payload


def _adjustment_order(adjustment: PayrollAdjustment, index: int) -> int:
    config = adjustment.config_snapshot if isinstance(adjustment.config_snapshot, dict) else {}
    try:
        return int(config.get("calculation_order", 900)) + index
    except (TypeError, ValueError):
        return 900 + index


def _applied_adjustments_by_snapshot(payroll_run: PayrollRun, snapshots: list[PayrollInputSnapshot]) -> dict[str, list[PayrollAdjustment]]:
    snapshots_by_employee_id = {snapshot.employee_id: snapshot for snapshot in snapshots}
    adjustments = PayrollAdjustment.objects.filter(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        status=PayrollAdjustmentStatus.APPLIED,
    ).select_related("employee", "input_snapshot", "salary_component").order_by("employee__employee_code", "effective_date", "component_code")
    grouped: dict[str, list[PayrollAdjustment]] = {}
    for adjustment in adjustments:
        snapshot = adjustment.input_snapshot or snapshots_by_employee_id.get(adjustment.employee_id)
        if not snapshot or snapshot.snapshot_status != PayrollInputSnapshotStatus.LOCKED:
            raise PayrollCalculationError("Applied payroll adjustments require locked input snapshots for the same payroll run.")
        grouped.setdefault(str(snapshot.id), []).append(adjustment)
    return grouped


def _validation_profile(payroll_run: PayrollRun) -> dict[str, Any]:
    config = payroll_run.config_snapshot if isinstance(payroll_run.config_snapshot, dict) else {}
    profile = config.get("validation_profile", {})
    return profile if isinstance(profile, dict) else {}


def _validation_profile_ref(payroll_run: PayrollRun) -> str:
    config = payroll_run.config_snapshot if isinstance(payroll_run.config_snapshot, dict) else {}
    return str(config.get("validation_profile_ref") or "payroll.validation.profile.default.v1")


def _profile_flag(profile: dict[str, Any], key: str, default: bool) -> bool:
    value = profile.get(key, default)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _profile_list(profile: dict[str, Any], key: str) -> list[str]:
    value = profile.get(key, [])
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _profile_severity(profile: dict[str, Any], key: str, default: str) -> str:
    value = str(profile.get(key) or default)
    return value if value in PayrollValidationSeverity.values else default


def _profile_category(profile: dict[str, Any], key: str, default: str) -> str:
    value = str(profile.get(key) or default)
    return value if value in PayrollValidationCategory.values else default


def _create_validation_issue(
    payroll_run: PayrollRun,
    *,
    severity: str,
    category: str,
    issue_code: str,
    title: str,
    detail: str = "",
    input_snapshot: PayrollInputSnapshot | None = None,
    employee=None,
    source_ref: str = "",
    context_snapshot: dict[str, Any] | None = None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollValidationIssue:
    return PayrollValidationIssue.objects.create(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        input_snapshot=input_snapshot,
        employee=employee or (input_snapshot.employee if input_snapshot else None),
        severity=severity,
        category=category,
        status=PayrollValidationIssueStatus.OPEN,
        issue_code=issue_code,
        title=title,
        detail=detail,
        source_ref=source_ref,
        validation_profile_ref=_validation_profile_ref(payroll_run),
        context_snapshot=_json_safe(context_snapshot or {}),
        config_snapshot=_json_safe(config_snapshot or {}),
    )


def _expression_dependency_paths(expression: str) -> list[str]:
    try:
        tree = ast.parse(expression or "", mode="eval")
    except SyntaxError:
        return []

    dependencies: set[str] = set()
    allowed_functions = set(SafePayrollExpressionEvaluator.ALLOWED_FUNCTIONS)

    def attribute_path(node: ast.AST) -> str | None:
        parts: list[str] = []
        current = node
        while isinstance(current, ast.Attribute):
            parts.append(current.attr)
            current = current.value
        if isinstance(current, ast.Name):
            parts.append(current.id)
            return ".".join(reversed(parts))
        return None

    class DependencyVisitor(ast.NodeVisitor):
        def visit_Call(self, node: ast.Call) -> None:
            for arg in node.args:
                self.visit(arg)
            for keyword in node.keywords:
                self.visit(keyword.value)

        def visit_Attribute(self, node: ast.Attribute) -> None:
            path = attribute_path(node)
            if path:
                root = path.split(".", 1)[0]
                if root not in allowed_functions:
                    dependencies.add(path)

        def visit_Name(self, node: ast.Name) -> None:
            if node.id not in allowed_functions:
                dependencies.add(node.id)

    DependencyVisitor().visit(tree.body)
    return sorted(dependencies)


def _context_has_path(context: dict[str, Any], path: str) -> bool:
    current: Any = context
    for part in [item for item in str(path or "").split(".") if item]:
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    return current is not None and current != ""


def _rule_output_paths(rule_version: PayrollRuleVersion, config: dict[str, Any]) -> list[str]:
    paths = [
        str(value)
        for value in [config.get("output_path"), config.get("result_path")]
        if value
    ]
    paths.append(f"components.{_normalized_key(rule_version.rule.code)}")
    paths.append(f"components.{_normalized_key(_component_code(rule_version, config))}")
    return sorted(set(paths))


def _rule_catalog(rule_versions: list[PayrollRuleVersion]) -> list[dict[str, Any]]:
    catalog = []
    for rule_version in rule_versions:
        config = _config_for_rule_version(rule_version)
        catalog.append({
            "rule_version": rule_version,
            "rule_code": rule_version.rule.code,
            "rule_name": rule_version.rule.name,
            "rule_type": rule_version.rule.rule_type,
            "component_code": _component_code(rule_version, config),
            "component_name": _component_name(rule_version, config),
            "line_type": _line_type(rule_version, config),
            "calculation_order": _calculation_order(rule_version),
            "output_paths": _rule_output_paths(rule_version, config),
            "dependencies": _expression_dependency_paths(rule_version.expression),
            "config": config,
        })
    return catalog


def validate_payroll_run_for_calculation(
    payroll_run: PayrollRun,
    *,
    snapshots: list[PayrollInputSnapshot],
    rule_versions: list[PayrollRuleVersion],
) -> list[PayrollValidationIssue]:
    """Persist configurable pre-calculation issues for a payroll run."""

    profile = _validation_profile(payroll_run)
    PayrollValidationIssue.objects.filter(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        calculation__isnull=True,
        status=PayrollValidationIssueStatus.OPEN,
    ).delete()

    issues: list[PayrollValidationIssue] = []
    profile_snapshot = {
        "validation_profile_ref": _validation_profile_ref(payroll_run),
        "validation_profile": profile,
    }

    def add_issue(**kwargs) -> None:
        issues.append(_create_validation_issue(payroll_run, config_snapshot=profile_snapshot, **kwargs))

    if not snapshots:
        add_issue(
            severity=PayrollValidationSeverity.BLOCKER,
            category=PayrollValidationCategory.SOURCE_DATA,
            issue_code="NO_INPUT_SNAPSHOTS",
            title="No payroll input snapshots found",
            detail="Collect and lock payroll input snapshots before draft calculation.",
            source_ref=f"payroll_run:{payroll_run.code}:input_snapshots",
        )

    require_locked_inputs = _profile_flag(profile, "require_locked_inputs", True)
    require_salary_payload = _profile_flag(profile, "require_salary_payload", True)
    require_salary_assignment = _profile_flag(profile, "require_salary_assignment", False)
    block_snapshot_blockers = _profile_flag(profile, "block_snapshot_blockers", True)
    warn_snapshot_warnings = _profile_flag(profile, "warn_snapshot_warnings", True)

    for snapshot in snapshots:
        if require_locked_inputs and snapshot.snapshot_status != PayrollInputSnapshotStatus.LOCKED:
            add_issue(
                severity=PayrollValidationSeverity.BLOCKER,
                category=PayrollValidationCategory.SOURCE_DATA,
                issue_code="SNAPSHOT_NOT_LOCKED",
                title="Input snapshot is not locked",
                detail="Every employee input snapshot must be locked before draft calculation.",
                input_snapshot=snapshot,
                source_ref=f"input_snapshot:{snapshot.employee.employee_code}:{snapshot.snapshot_status}",
                context_snapshot={"snapshot_status": snapshot.snapshot_status, "source_hash": snapshot.source_hash},
            )

        salary_snapshot = snapshot.salary_snapshot if isinstance(snapshot.salary_snapshot, dict) else {}
        if require_salary_payload and not salary_snapshot.get("annual_ctc"):
            add_issue(
                severity=PayrollValidationSeverity.BLOCKER,
                category=PayrollValidationCategory.SALARY_SETUP,
                issue_code="MISSING_SALARY_PAYLOAD",
                title="Missing salary payload",
                detail="Locked payroll calculation requires annual CTC or equivalent salary values in the input snapshot.",
                input_snapshot=snapshot,
                source_ref=f"salary_snapshot:{snapshot.employee.employee_code}",
                context_snapshot={"salary_snapshot_keys": sorted(str(key) for key in salary_snapshot.keys())},
            )

        if require_salary_assignment and not snapshot.salary_assignment_id:
            add_issue(
                severity=PayrollValidationSeverity.BLOCKER,
                category=PayrollValidationCategory.SALARY_SETUP,
                issue_code="MISSING_SALARY_ASSIGNMENT",
                title="Missing salary assignment",
                detail="The active validation profile requires each payroll input snapshot to link to a salary assignment.",
                input_snapshot=snapshot,
                source_ref=f"salary_assignment:{snapshot.employee.employee_code}",
            )

        validation_snapshot = snapshot.validation_snapshot if isinstance(snapshot.validation_snapshot, dict) else {}
        blockers = validation_snapshot.get("blockers", [])
        warnings = validation_snapshot.get("warnings", [])
        blockers = blockers if isinstance(blockers, list) else [blockers]
        warnings = warnings if isinstance(warnings, list) else [warnings]

        if block_snapshot_blockers and blockers:
            add_issue(
                severity=PayrollValidationSeverity.BLOCKER,
                category=PayrollValidationCategory.SOURCE_DATA,
                issue_code="SNAPSHOT_BLOCKERS",
                title="Snapshot has source-data blockers",
                detail="Resolve blocker items captured during payroll input collection before calculation.",
                input_snapshot=snapshot,
                source_ref=f"validation_snapshot:{snapshot.employee.employee_code}:blockers",
                context_snapshot={"blockers": blockers, "source_hash": snapshot.source_hash},
            )

        if warn_snapshot_warnings and warnings:
            add_issue(
                severity=PayrollValidationSeverity.WARNING,
                category=PayrollValidationCategory.SOURCE_DATA,
                issue_code="SNAPSHOT_WARNINGS",
                title="Snapshot has source-data warnings",
                detail="Review warning items captured during payroll input collection before approving payroll.",
                input_snapshot=snapshot,
                source_ref=f"validation_snapshot:{snapshot.employee.employee_code}:warnings",
                context_snapshot={"warnings": warnings, "source_hash": snapshot.source_hash},
            )

    if _profile_flag(profile, "require_rule_versions", True) and not rule_versions:
        add_issue(
            severity=PayrollValidationSeverity.BLOCKER,
            category=PayrollValidationCategory.RULE_SETUP,
            issue_code="NO_ACTIVE_RULE_VERSIONS",
            title="No active payroll rules matched the run",
            detail="Activate effective-dated payroll rule versions or update the calculation profile rule selection.",
            source_ref=f"payroll_run:{payroll_run.code}:rule_versions",
        )

    component_codes: dict[str, list[str]] = {}
    for rule_version in rule_versions:
        component_codes.setdefault(_component_code(rule_version, _config_for_rule_version(rule_version)), []).append(rule_version.rule.code)
    duplicate_components = {code: rules for code, rules in component_codes.items() if len(rules) > 1}
    if duplicate_components and _profile_flag(profile, "warn_duplicate_component_rules", True):
        add_issue(
            severity=PayrollValidationSeverity.WARNING,
            category=PayrollValidationCategory.RULE_SETUP,
            issue_code="DUPLICATE_COMPONENT_RULES",
            title="Multiple active rules target the same component",
            detail="Review calculation ordering and component mapping before approval.",
            source_ref=f"payroll_run:{payroll_run.code}:component_rules",
            context_snapshot={"component_rules": duplicate_components},
        )

    catalog = _rule_catalog(rule_versions)
    component_codes = {str(item["component_code"]) for item in catalog}
    output_paths_by_rule = {
        output_path: item
        for item in catalog
        for output_path in item["output_paths"]
    }
    produced_paths: set[str] = set()
    duplicate_output_paths = sorted(
        {
            output_path
            for output_path in output_paths_by_rule
            if sum(1 for item in catalog if output_path in item["output_paths"]) > 1 and not output_path.startswith("components.")
        }
    )

    for component_code in _profile_list(profile, "required_component_codes"):
        if component_code not in component_codes:
            add_issue(
                severity=_profile_severity(profile, "required_component_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.RULE_SETUP,
                issue_code="REQUIRED_COMPONENT_MISSING",
                title="Required payroll component is not produced",
                detail="The active validation profile requires a component that no matched active rule version currently produces.",
                source_ref=f"payroll_run:{payroll_run.code}:component:{component_code}",
                context_snapshot={"required_component_code": component_code, "available_component_codes": sorted(component_codes)},
            )

    output_path_set = set(output_paths_by_rule)
    for output_path in _profile_list(profile, "required_output_paths"):
        if output_path not in output_path_set:
            add_issue(
                severity=_profile_severity(profile, "required_output_path_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.RULE_SETUP,
                issue_code="REQUIRED_OUTPUT_PATH_MISSING",
                title="Required payroll output path is not produced",
                detail="The active validation profile requires an output path that no matched active rule version currently writes.",
                source_ref=f"payroll_run:{payroll_run.code}:output_path:{output_path}",
                context_snapshot={"required_output_path": output_path, "available_output_paths": sorted(output_path_set)},
            )

    if duplicate_output_paths and _profile_flag(profile, "warn_duplicate_output_paths", True):
        add_issue(
            severity=PayrollValidationSeverity.WARNING,
            category=PayrollValidationCategory.RULE_SETUP,
            issue_code="DUPLICATE_OUTPUT_PATHS",
            title="Multiple rules write the same output path",
            detail="Review calculation order and output mapping so downstream formulas consume the intended value.",
            source_ref=f"payroll_run:{payroll_run.code}:output_paths",
            context_snapshot={"duplicate_output_paths": duplicate_output_paths},
        )

    allowed_line_types = set(_profile_list(profile, "allowed_line_types"))
    if allowed_line_types:
        invalid_lines = [
            {"rule_code": item["rule_code"], "component_code": item["component_code"], "line_type": item["line_type"]}
            for item in catalog
            if str(item["line_type"]) not in allowed_line_types
        ]
        if invalid_lines:
            add_issue(
                severity=_profile_severity(profile, "invalid_line_type_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.RULE_SETUP,
                issue_code="INVALID_LINE_TYPE",
                title="Rule has a line type outside the validation profile",
                detail="Update the rule component mapping or the tenant validation profile allowed line types.",
                source_ref=f"payroll_run:{payroll_run.code}:line_types",
                context_snapshot={"invalid_lines": invalid_lines, "allowed_line_types": sorted(allowed_line_types)},
            )

    required_statutory_refs = _profile_list(profile, "required_statutory_profile_refs")
    if required_statutory_refs:
        available_refs = {
            str(value)
            for item in catalog
            for value in [
                item["config"].get("statutory_pack_ref"),
                item["config"].get("statutory_treatment_ref"),
                item["config"].get("tax_profile_ref"),
            ]
            if value
        }
        missing_refs = [item for item in required_statutory_refs if item not in available_refs]
        if missing_refs:
            add_issue(
                severity=_profile_severity(profile, "required_statutory_profile_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.STATUTORY_SETUP,
                issue_code="REQUIRED_STATUTORY_PROFILE_MISSING",
                title="Required statutory profile is not configured",
                detail="The validation profile requires statutory pack/treatment references that are absent from the matched rules.",
                source_ref=f"payroll_run:{payroll_run.code}:statutory_profiles",
                context_snapshot={"missing_statutory_refs": missing_refs, "available_statutory_refs": sorted(available_refs)},
            )

    required_statutory_line_types = set(_profile_list(profile, "require_statutory_ref_for_line_types"))
    if required_statutory_line_types:
        missing_statutory_mapping = []
        for item in catalog:
            if str(item["line_type"]) not in required_statutory_line_types:
                continue
            config = item["config"]
            if not (config.get("statutory_pack_ref") or config.get("statutory_treatment_ref") or config.get("tax_profile_ref")):
                missing_statutory_mapping.append({
                    "rule_code": item["rule_code"],
                    "component_code": item["component_code"],
                    "line_type": item["line_type"],
                })
        if missing_statutory_mapping:
            add_issue(
                severity=_profile_severity(profile, "missing_statutory_mapping_severity", PayrollValidationSeverity.BLOCKER),
                category=PayrollValidationCategory.STATUTORY_SETUP,
                issue_code="MISSING_STATUTORY_MAPPING",
                title="Statutory component is missing statutory mapping",
                detail="Add statutory pack, statutory treatment, or tax profile references to rule configuration.",
                source_ref=f"payroll_run:{payroll_run.code}:statutory_mappings",
                context_snapshot={"missing_statutory_mapping": missing_statutory_mapping},
            )

    dependency_severity = _profile_severity(profile, "dependency_order_severity", PayrollValidationSeverity.BLOCKER)
    if _profile_flag(profile, "validate_rule_dependency_order", True) and snapshots:
        sample_context = build_payroll_rule_context_from_snapshot(snapshots[0])
        sample_context.setdefault("components", {})
        for item in catalog:
            missing_dependencies = []
            future_dependencies = []
            for dependency in item["dependencies"]:
                if _context_has_path(sample_context, dependency) or dependency in produced_paths:
                    continue
                producer = output_paths_by_rule.get(dependency)
                if producer:
                    future_dependencies.append({
                        "dependency": dependency,
                        "producer_rule_code": producer["rule_code"],
                        "producer_order": producer["calculation_order"],
                    })
                else:
                    missing_dependencies.append(dependency)

            if future_dependencies:
                add_issue(
                    severity=dependency_severity,
                    category=PayrollValidationCategory.RULE_SETUP,
                    issue_code="RULE_DEPENDENCY_ORDER",
                    title="Rule depends on an output produced later",
                    detail="Move the producing rule earlier or change the consuming rule dependency.",
                    source_ref=f"payroll_rule:{item['rule_code']}:dependencies",
                    context_snapshot={
                        "rule_code": item["rule_code"],
                        "calculation_order": item["calculation_order"],
                        "future_dependencies": future_dependencies,
                    },
                )

            if missing_dependencies:
                add_issue(
                    severity=_profile_severity(profile, "missing_dependency_severity", PayrollValidationSeverity.WARNING),
                    category=_profile_category(profile, "missing_dependency_category", PayrollValidationCategory.RULE_SETUP),
                    issue_code="RULE_DEPENDENCY_NOT_FOUND",
                    title="Rule references inputs not found in snapshot or prior outputs",
                    detail="Confirm the dependency is supplied by locked source data, an integration, or an earlier rule output.",
                    source_ref=f"payroll_rule:{item['rule_code']}:dependencies",
                    context_snapshot={
                        "rule_code": item["rule_code"],
                        "calculation_order": item["calculation_order"],
                        "missing_dependencies": missing_dependencies,
                    },
                )

            produced_paths.update(item["output_paths"])

    snapshots_by_employee_id = {snapshot.employee_id: snapshot for snapshot in snapshots}
    applied_adjustments = PayrollAdjustment.objects.filter(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        status=PayrollAdjustmentStatus.APPLIED,
    ).select_related("employee", "input_snapshot")
    for adjustment in applied_adjustments:
        snapshot = adjustment.input_snapshot or snapshots_by_employee_id.get(adjustment.employee_id)
        if not snapshot or snapshot.snapshot_status != PayrollInputSnapshotStatus.LOCKED:
            add_issue(
                severity=PayrollValidationSeverity.BLOCKER,
                category=PayrollValidationCategory.ADJUSTMENT,
                issue_code="APPLIED_ADJUSTMENT_WITHOUT_LOCKED_SNAPSHOT",
                title="Applied adjustment is missing a locked snapshot",
                detail="Applied one-time payroll inputs must resolve to a locked employee input snapshot for the same run.",
                employee=adjustment.employee,
                source_ref=adjustment.source_ref,
                context_snapshot={"adjustment_id": str(adjustment.id), "status": adjustment.status, "source_hash": adjustment.source_hash},
            )

    if _profile_flag(profile, "warn_pending_adjustments", True):
        pending_adjustments = PayrollAdjustment.objects.filter(
            tenant=payroll_run.tenant,
            payroll_run=payroll_run,
            status__in=[PayrollAdjustmentStatus.DRAFT, PayrollAdjustmentStatus.SUBMITTED, PayrollAdjustmentStatus.APPROVED],
        ).select_related("employee").order_by("employee__employee_code", "component_code")
        for adjustment in pending_adjustments[:25]:
            add_issue(
                severity=PayrollValidationSeverity.WARNING,
                category=PayrollValidationCategory.ADJUSTMENT,
                issue_code="PENDING_ADJUSTMENT",
                title="Pending payroll adjustment not applied",
                detail="Draft calculation can continue, but this adjustment will not be consumed until it is applied.",
                employee=adjustment.employee,
                source_ref=adjustment.source_ref,
                context_snapshot={
                    "adjustment_id": str(adjustment.id),
                    "status": adjustment.status,
                    "component_code": adjustment.component_code,
                    "amount": str(adjustment.amount),
                },
            )

    if _profile_flag(profile, "warn_pending_settlements", True):
        pending_settlements = PayrollSettlement.objects.filter(
            tenant=payroll_run.tenant,
            payroll_run=payroll_run,
            status__in=[PayrollSettlementStatus.DRAFT, PayrollSettlementStatus.SUBMITTED, PayrollSettlementStatus.APPROVED],
        ).select_related("employee").order_by("employee__employee_code", "settlement_date")
        for settlement in pending_settlements[:25]:
            add_issue(
                severity=PayrollValidationSeverity.WARNING,
                category=PayrollValidationCategory.SETTLEMENT,
                issue_code="PENDING_SETTLEMENT",
                title="Pending settlement not applied",
                detail="Draft calculation can continue, but this settlement will not be consumed until it is applied.",
                employee=settlement.employee,
                source_ref=settlement.source_ref,
                context_snapshot={
                    "settlement_id": str(settlement.id),
                    "status": settlement.status,
                    "settlement_date": settlement.settlement_date.isoformat() if settlement.settlement_date else None,
                },
            )

    return issues


def calculate_draft_payroll_run(
    payroll_run: PayrollRun,
    *,
    calculated_by=None,
    calculation_profile_ref: str | None = None,
) -> PayrollRunCalculation:
    """Create a draft calculation attempt from locked input snapshots and active rule versions."""

    if payroll_run.status not in {PayrollRunStatus.INPUTS_LOCKED, PayrollRunStatus.CALCULATED}:
        raise PayrollCalculationError("Payroll inputs must be locked before draft calculation.")

    all_snapshots = PayrollInputSnapshot.objects.filter(tenant=payroll_run.tenant, payroll_run=payroll_run)
    snapshot_count = all_snapshots.count()
    if snapshot_count == 0:
        raise PayrollCalculationError("Cannot calculate payroll before input snapshots are collected.")

    snapshots = list(all_snapshots.select_related("employee").order_by("employee__employee_code"))
    rule_versions = _selected_rule_versions(payroll_run)
    validation_issues = validate_payroll_run_for_calculation(
        payroll_run,
        snapshots=snapshots,
        rule_versions=rule_versions,
    )
    blocker_count = sum(1 for issue in validation_issues if issue.severity == PayrollValidationSeverity.BLOCKER)
    if blocker_count:
        raise PayrollCalculationError(f"Payroll run has {blocker_count} blocker validation issue(s) before draft calculation.")

    locked_snapshots = [snapshot for snapshot in snapshots if snapshot.snapshot_status == PayrollInputSnapshotStatus.LOCKED]
    if len(locked_snapshots) != snapshot_count:
        raise PayrollCalculationError("All payroll input snapshots must be locked before draft calculation.")
    if not rule_versions:
        raise PayrollCalculationError("No active payroll rule versions matched this run and period.")
    applied_adjustments = _applied_adjustments_by_snapshot(payroll_run, locked_snapshots)

    profile_ref = calculation_profile_ref or (
        payroll_run.config_snapshot.get("calculation_profile_ref") if isinstance(payroll_run.config_snapshot, dict) else None
    ) or "payroll.calculation.profile.default.v1"
    calculated_at = timezone.now()

    with transaction.atomic():
        PayrollRunCalculation.objects.filter(
            tenant=payroll_run.tenant,
            payroll_run=payroll_run,
            status__in=[PayrollCalculationStatus.DRAFT, PayrollCalculationStatus.COMPLETED],
        ).update(status=PayrollCalculationStatus.SUPERSEDED)
        next_attempt = (PayrollRunCalculation.objects.filter(payroll_run=payroll_run).aggregate(Max("attempt_number"))["attempt_number__max"] or 0) + 1
        calculation = PayrollRunCalculation.objects.create(
            tenant=payroll_run.tenant,
            payroll_run=payroll_run,
            attempt_number=next_attempt,
            status=PayrollCalculationStatus.DRAFT,
            calculation_profile_ref=profile_ref,
            calculated_by=calculated_by,
            rule_selection_snapshot={
                "period_start": payroll_run.period.start_date.isoformat(),
                "period_end": payroll_run.period.end_date.isoformat(),
                "validation_profile_ref": _validation_profile_ref(payroll_run),
                "validation_issue_count": len(validation_issues),
                "rule_versions": [
                    {
                        "rule_code": item.rule.code,
                        "rule_name": item.rule.name,
                        "rule_type": item.rule.rule_type,
                        "version": item.version,
                        "calculation_order": _calculation_order(item),
                    }
                    for item in rule_versions
                ],
                "applied_adjustments": [
                    {
                        "adjustment_id": str(adjustment.id),
                        "employee_code": adjustment.employee.employee_code,
                        "kind": adjustment.kind,
                        "direction": adjustment.direction,
                        "component_code": adjustment.component_code,
                        "amount": str(_round_decimal(adjustment.amount, 2)),
                        "source_hash": adjustment.source_hash,
                    }
                    for adjustments in applied_adjustments.values()
                    for adjustment in adjustments
                ],
            },
            config_snapshot={
                "calculation_profile": payroll_run.config_snapshot.get("calculation_profile", {}) if isinstance(payroll_run.config_snapshot, dict) else {},
            },
        )

        total_values = {
            "gross_earnings": Decimal("0.00"),
            "employee_deductions": Decimal("0.00"),
            "employer_contributions": Decimal("0.00"),
            "net_pay": Decimal("0.00"),
        }
        error_count = 0
        line_count = 0

        for snapshot in locked_snapshots:
            context = build_payroll_rule_context_from_snapshot(snapshot)
            context.setdefault("components", {})
            employee_totals = {
                "gross_earnings": Decimal("0.00"),
                "employee_deductions": Decimal("0.00"),
                "employer_contributions": Decimal("0.00"),
                "net_pay": Decimal("0.00"),
            }
            for rule_version in rule_versions:
                config = _config_for_rule_version(rule_version)
                component_code = _component_code(rule_version, config)
                component_name = _component_name(rule_version, config)
                line_type = _line_type(rule_version, config)
                calculation_order = _calculation_order(rule_version)
                currency_code = _currency_code(payroll_run, config)

                try:
                    evaluation_result = evaluate_payroll_rule_version(rule_version, context=context)
                    amount = _round_decimal(evaluation_result.result, 2)
                    status = PayrollCalculationLineStatus.CALCULATED
                    error_message = ""
                    result_payload = {"result": _json_safe(amount)}
                    trace_payload = {
                        "dependencies": evaluation_result.dependencies,
                        "trace": evaluation_result.as_payload()["trace"],
                        "source_hash": snapshot.source_hash,
                        "rule_code": rule_version.rule.code,
                        "rule_version": rule_version.version,
                    }
                    _apply_line_to_totals(employee_totals, line_type, amount)
                    _apply_line_to_totals(total_values, line_type, amount)
                    for output_path in [
                        config.get("output_path"),
                        config.get("result_path"),
                    ]:
                        if output_path:
                            _set_context_path(context, str(output_path), amount)
                    context["components"][_normalized_key(rule_version.rule.code)] = amount
                    context["components"][_normalized_key(component_code)] = amount
                except PayrollRuleEvaluationError as exc:
                    amount = Decimal("0.00")
                    status = PayrollCalculationLineStatus.ERROR
                    error_message = str(exc)
                    result_payload = {"result": "0.00"}
                    trace_payload = {
                        "dependencies": [],
                        "trace": [],
                        "source_hash": snapshot.source_hash,
                        "rule_code": rule_version.rule.code,
                        "rule_version": rule_version.version,
                        "error": str(exc),
                    }
                    error_count += 1

                PayrollCalculationLine.objects.create(
                    tenant=payroll_run.tenant,
                    calculation=calculation,
                    payroll_run=payroll_run,
                    input_snapshot=snapshot,
                    employee=snapshot.employee,
                    rule_version=rule_version,
                    line_source=PayrollCalculationLineSource.RULE,
                    component_code=component_code,
                    component_name=component_name,
                    line_type=line_type,
                    calculation_order=calculation_order,
                    amount=amount,
                    currency_code=currency_code,
                    status=status,
                    expression=rule_version.expression,
                    source_hash=snapshot.source_hash,
                    context_snapshot=_json_safe(context),
                    result_snapshot=result_payload,
                    trace_snapshot=trace_payload,
                    error_message=error_message,
                    config_snapshot=config,
                )
                line_count += 1

            for adjustment_index, adjustment in enumerate(applied_adjustments.get(str(snapshot.id), [])):
                amount = _round_decimal(adjustment.amount, 2)
                line_type = adjustment.direction
                _apply_line_to_totals(employee_totals, line_type, amount)
                _apply_line_to_totals(total_values, line_type, amount)
                context["components"][_normalized_key(adjustment.component_code)] = amount
                PayrollCalculationLine.objects.create(
                    tenant=payroll_run.tenant,
                    calculation=calculation,
                    payroll_run=payroll_run,
                    input_snapshot=snapshot,
                    employee=snapshot.employee,
                    adjustment=adjustment,
                    line_source=PayrollCalculationLineSource.ADJUSTMENT,
                    component_code=adjustment.component_code,
                    component_name=adjustment.component_name,
                    line_type=line_type,
                    calculation_order=_adjustment_order(adjustment, adjustment_index),
                    amount=amount,
                    currency_code=adjustment.currency_code,
                    status=PayrollCalculationLineStatus.CALCULATED,
                    expression="",
                    source_hash=adjustment.source_hash,
                    context_snapshot=_json_safe({
                        "adjustment": {
                            "adjustment_id": str(adjustment.id),
                            "kind": adjustment.kind,
                            "direction": adjustment.direction,
                            "profile_ref": adjustment.adjustment_profile_ref,
                            "source_ref": adjustment.source_ref,
                        },
                        "source_snapshot_hash": snapshot.source_hash,
                    }),
                    result_snapshot={"result": str(amount)},
                    trace_snapshot={
                        "dependencies": ["payroll_adjustment.amount"],
                        "trace": [{"source": "payroll_adjustment", "amount": str(amount)}],
                        "source_hash": adjustment.source_hash,
                        "adjustment_id": str(adjustment.id),
                        "adjustment_profile_ref": adjustment.adjustment_profile_ref,
                    },
                    error_message="",
                    config_snapshot={
                        **(adjustment.config_snapshot if isinstance(adjustment.config_snapshot, dict) else {}),
                        "line_source": PayrollCalculationLineSource.ADJUSTMENT,
                        "adjustment_kind": adjustment.kind,
                        "adjustment_profile_ref": adjustment.adjustment_profile_ref,
                        "approval_profile_ref": adjustment.approval_profile_ref,
                        "source_ref": adjustment.source_ref,
                    },
                )
                line_count += 1

            context["totals"] = employee_totals

        calculation.status = PayrollCalculationStatus.FAILED if error_count else PayrollCalculationStatus.COMPLETED
        calculation.calculated_at = calculated_at
        calculation.totals_snapshot = _totals_payload(
            total_values,
            employee_count=len(locked_snapshots),
            line_count=line_count,
            error_count=error_count,
        )
        calculation.error_snapshot = {
            "error_count": error_count,
            "applied_adjustment_count": sum(len(items) for items in applied_adjustments.values()),
            "validation_issue_count": len(validation_issues),
            "validation_warning_count": sum(1 for issue in validation_issues if issue.severity == PayrollValidationSeverity.WARNING),
            "validation_blocker_count": sum(1 for issue in validation_issues if issue.severity == PayrollValidationSeverity.BLOCKER),
        }
        calculation.save()
        if validation_issues:
            PayrollValidationIssue.objects.filter(id__in=[issue.id for issue in validation_issues]).exclude(
                severity=PayrollValidationSeverity.BLOCKER,
            ).update(calculation=calculation)

        if error_count == 0:
            payroll_run.status = PayrollRunStatus.CALCULATED
            payroll_run.save()

    return calculation


def create_payroll_adjustment(
    payroll_run: PayrollRun,
    *,
    employee,
    kind: str,
    direction: str,
    component_code: str,
    component_name: str,
    amount: Decimal,
    effective_date,
    input_snapshot: PayrollInputSnapshot | None = None,
    salary_component=None,
    currency_code: str | None = None,
    source_period_start=None,
    source_period_end=None,
    adjustment_profile_ref: str | None = None,
    approval_profile_ref: str = "",
    source_ref: str = "",
    reason: str = "",
    created_by=None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollAdjustment:
    """Create a configurable one-time payroll adjustment input."""

    if payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollAdjustmentError("Payroll adjustments cannot be created after run review starts.")
    return PayrollAdjustment.objects.create(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        employee=employee,
        input_snapshot=input_snapshot,
        salary_component=salary_component,
        kind=kind,
        status=PayrollAdjustmentStatus.DRAFT,
        direction=direction,
        component_code=component_code,
        component_name=component_name,
        amount=_round_decimal(amount, 2),
        currency_code=(currency_code or payroll_run.period.calendar.currency_code or "INR")[:3],
        effective_date=effective_date,
        source_period_start=source_period_start,
        source_period_end=source_period_end,
        adjustment_profile_ref=adjustment_profile_ref or "payroll.adjustment.profile.default.v1",
        approval_profile_ref=approval_profile_ref,
        source_ref=source_ref or f"{kind}:{employee.employee_code}:{component_code}:{effective_date}",
        reason=reason,
        config_snapshot={**(config_snapshot or {}), "created_by": str(created_by) if created_by else ""},
    )


def submit_payroll_adjustment(adjustment: PayrollAdjustment, *, submitted_by=None) -> PayrollAdjustment:
    """Submit a draft or rejected payroll adjustment for approval."""

    if adjustment.status not in {PayrollAdjustmentStatus.DRAFT, PayrollAdjustmentStatus.REJECTED}:
        raise PayrollAdjustmentError("Only draft or rejected payroll adjustments can be submitted.")
    if adjustment.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollAdjustmentError("Payroll adjustments cannot be submitted after run review starts.")
    adjustment.status = PayrollAdjustmentStatus.SUBMITTED
    adjustment.submitted_at = timezone.now()
    adjustment.submitted_by = submitted_by
    adjustment.rejected_at = None
    adjustment.rejected_by = None
    adjustment.save()
    return adjustment


def approve_payroll_adjustment(
    adjustment: PayrollAdjustment,
    *,
    approved_by=None,
    approval_profile_ref: str | None = None,
) -> PayrollAdjustment:
    """Approve a submitted payroll adjustment."""

    if adjustment.status != PayrollAdjustmentStatus.SUBMITTED:
        raise PayrollAdjustmentError("Payroll adjustment must be submitted before approval.")
    if adjustment.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollAdjustmentError("Payroll adjustments cannot be approved after run review starts.")
    adjustment.status = PayrollAdjustmentStatus.APPROVED
    adjustment.approved_at = timezone.now()
    adjustment.approved_by = approved_by
    if approval_profile_ref:
        adjustment.approval_profile_ref = approval_profile_ref
    adjustment.save()
    return adjustment


def reject_payroll_adjustment(adjustment: PayrollAdjustment, *, rejected_by=None, reason: str = "") -> PayrollAdjustment:
    """Reject a submitted payroll adjustment."""

    if adjustment.status != PayrollAdjustmentStatus.SUBMITTED:
        raise PayrollAdjustmentError("Payroll adjustment must be submitted before rejection.")
    adjustment.status = PayrollAdjustmentStatus.REJECTED
    adjustment.rejected_at = timezone.now()
    adjustment.rejected_by = rejected_by
    if reason:
        adjustment.reason = f"{adjustment.reason}\n\nRejection: {reason}".strip()
    adjustment.save()
    return adjustment


def apply_payroll_adjustment(adjustment: PayrollAdjustment, *, applied_by=None) -> PayrollAdjustment:
    """Mark an approved adjustment as consumed by payroll input/calculation preparation."""

    if adjustment.status != PayrollAdjustmentStatus.APPROVED:
        raise PayrollAdjustmentError("Only approved payroll adjustments can be applied.")
    if adjustment.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollAdjustmentError("Payroll adjustments cannot be applied after run review starts.")
    adjustment.status = PayrollAdjustmentStatus.APPLIED
    adjustment.applied_at = timezone.now()
    adjustment.applied_by = applied_by
    adjustment.save()
    return adjustment


def _settlement_adjustment_kind(line_kind: str) -> str:
    mapping = {
        PayrollSettlementLineKind.LEAVE_ENCASHMENT: "settlement",
        PayrollSettlementLineKind.NOTICE_RECOVERY: "settlement",
        PayrollSettlementLineKind.LOAN_RECOVERY: "loan",
        PayrollSettlementLineKind.ADVANCE_RECOVERY: "advance",
        PayrollSettlementLineKind.BONUS: "bonus",
        PayrollSettlementLineKind.ARREAR: "arrear",
        PayrollSettlementLineKind.GRATUITY: "settlement",
        PayrollSettlementLineKind.STATUTORY: "settlement",
        PayrollSettlementLineKind.SALARY_PRORATION: "settlement",
    }
    return mapping.get(line_kind, "settlement")


def _settlement_totals(settlement: PayrollSettlement) -> dict[str, Any]:
    lines = list(settlement.lines.all())
    gross_dues = Decimal("0.00")
    deductions = Decimal("0.00")
    reimbursements = Decimal("0.00")
    employer_contributions = Decimal("0.00")
    taxes = Decimal("0.00")
    informational = Decimal("0.00")
    for line in lines:
        amount = _round_decimal(line.amount, 2)
        if line.direction == PayrollAdjustmentDirection.EARNING:
            gross_dues += amount
        elif line.direction == PayrollAdjustmentDirection.DEDUCTION:
            deductions += amount
        elif line.direction == PayrollAdjustmentDirection.REIMBURSEMENT:
            reimbursements += amount
        elif line.direction == PayrollAdjustmentDirection.EMPLOYER_CONTRIBUTION:
            employer_contributions += amount
        elif line.direction == PayrollAdjustmentDirection.TAX:
            taxes += amount
        elif line.direction == PayrollAdjustmentDirection.INFORMATIONAL:
            informational += amount
    net_settlement = gross_dues + reimbursements - deductions - taxes
    return {
        "gross_dues": str(_round_decimal(gross_dues, 2)),
        "deductions": str(_round_decimal(deductions, 2)),
        "reimbursements": str(_round_decimal(reimbursements, 2)),
        "employer_contributions": str(_round_decimal(employer_contributions, 2)),
        "taxes": str(_round_decimal(taxes, 2)),
        "informational": str(_round_decimal(informational, 2)),
        "net_settlement": str(_round_decimal(net_settlement, 2)),
        "line_count": len(lines),
    }


def sync_payroll_settlement_totals(settlement: PayrollSettlement) -> PayrollSettlement:
    settlement.totals_snapshot = _settlement_totals(settlement)
    settlement.save()
    return settlement


def create_payroll_settlement(
    payroll_run: PayrollRun,
    *,
    employee,
    exit_record=None,
    input_snapshot: PayrollInputSnapshot | None = None,
    settlement_date: date,
    last_working_date: date | None = None,
    currency_code: str = "",
    settlement_profile_ref: str | None = None,
    approval_profile_ref: str = "",
    calculation_profile_ref: str = "",
    source_ref: str = "",
    reason: str = "",
    created_by=None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollSettlement:
    """Create a configurable full-and-final settlement package."""

    if payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollSettlementError("Payroll settlements cannot be created after run review starts.")
    settlement = PayrollSettlement.objects.create(
        tenant=payroll_run.tenant,
        payroll_run=payroll_run,
        employee=employee,
        exit_record=exit_record,
        input_snapshot=input_snapshot,
        status=PayrollSettlementStatus.DRAFT,
        settlement_profile_ref=settlement_profile_ref or "payroll.settlement.profile.default.v1",
        approval_profile_ref=approval_profile_ref,
        calculation_profile_ref=calculation_profile_ref,
        source_ref=source_ref or f"settlement:{employee.employee_code}:{settlement_date}",
        reason=reason,
        settlement_date=settlement_date,
        last_working_date=last_working_date,
        currency_code=(currency_code or payroll_run.period.calendar.currency_code or "INR")[:3],
        config_snapshot={**(config_snapshot or {}), "created_by": str(created_by) if created_by else ""},
    )
    return sync_payroll_settlement_totals(settlement)


def create_payroll_settlement_line(
    settlement: PayrollSettlement,
    *,
    line_kind: str,
    direction: str,
    component_code: str,
    component_name: str,
    amount: Decimal,
    salary_component=None,
    currency_code: str = "",
    calculation_order: int = 900,
    source_ref: str = "",
    trace_snapshot: dict[str, Any] | None = None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollSettlementLine:
    """Create a settlement component line and refresh package totals."""

    if settlement.status not in {PayrollSettlementStatus.DRAFT, PayrollSettlementStatus.REJECTED}:
        raise PayrollSettlementError("Settlement lines can only be changed while a settlement is draft or rejected.")
    if settlement.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollSettlementError("Settlement lines cannot be changed after run review starts.")
    line = PayrollSettlementLine.objects.create(
        tenant=settlement.tenant,
        settlement=settlement,
        salary_component=salary_component,
        line_kind=line_kind,
        direction=direction,
        component_code=component_code,
        component_name=component_name,
        amount=_round_decimal(amount, 2),
        currency_code=(currency_code or settlement.currency_code or "INR")[:3],
        calculation_order=calculation_order,
        source_ref=source_ref or f"{settlement.source_ref}:{line_kind}:{component_code}",
        trace_snapshot=trace_snapshot or {},
        config_snapshot=config_snapshot or {},
    )
    sync_payroll_settlement_totals(settlement)
    return line


def submit_payroll_settlement(settlement: PayrollSettlement, *, submitted_by=None) -> PayrollSettlement:
    """Submit a full-and-final settlement package for approval."""

    if settlement.status not in {PayrollSettlementStatus.DRAFT, PayrollSettlementStatus.REJECTED}:
        raise PayrollSettlementError("Only draft or rejected payroll settlements can be submitted.")
    if settlement.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollSettlementError("Payroll settlements cannot be submitted after run review starts.")
    if not settlement.lines.exists():
        raise PayrollSettlementError("Payroll settlements require at least one settlement line before submission.")
    settlement.status = PayrollSettlementStatus.SUBMITTED
    settlement.submitted_at = timezone.now()
    settlement.submitted_by = submitted_by
    settlement.rejected_at = None
    settlement.rejected_by = None
    settlement.totals_snapshot = _settlement_totals(settlement)
    settlement.save()
    return settlement


def approve_payroll_settlement(
    settlement: PayrollSettlement,
    *,
    approved_by=None,
    approval_profile_ref: str | None = None,
) -> PayrollSettlement:
    """Approve a submitted full-and-final settlement package."""

    if settlement.status != PayrollSettlementStatus.SUBMITTED:
        raise PayrollSettlementError("Payroll settlement must be submitted before approval.")
    if settlement.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollSettlementError("Payroll settlements cannot be approved after run review starts.")
    settlement.status = PayrollSettlementStatus.APPROVED
    settlement.approved_at = timezone.now()
    settlement.approved_by = approved_by
    if approval_profile_ref:
        settlement.approval_profile_ref = approval_profile_ref
    settlement.totals_snapshot = _settlement_totals(settlement)
    settlement.save()
    return settlement


def reject_payroll_settlement(settlement: PayrollSettlement, *, rejected_by=None, reason: str = "") -> PayrollSettlement:
    """Reject a submitted full-and-final settlement package."""

    if settlement.status != PayrollSettlementStatus.SUBMITTED:
        raise PayrollSettlementError("Payroll settlement must be submitted before rejection.")
    settlement.status = PayrollSettlementStatus.REJECTED
    settlement.rejected_at = timezone.now()
    settlement.rejected_by = rejected_by
    if reason:
        settlement.reason = f"{settlement.reason}\n\nRejection: {reason}".strip()
    settlement.save()
    return settlement


@transaction.atomic
def apply_payroll_settlement(settlement: PayrollSettlement, *, applied_by=None) -> PayrollSettlement:
    """Apply approved settlement lines as payroll adjustments for calculation consumption."""

    if settlement.status != PayrollSettlementStatus.APPROVED:
        raise PayrollSettlementError("Only approved payroll settlements can be applied.")
    if settlement.payroll_run.status in {PayrollRunStatus.REVIEW, PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED}:
        raise PayrollSettlementError("Payroll settlements cannot be applied after run review starts.")
    if settlement.input_snapshot_id and settlement.input_snapshot.snapshot_status != PayrollInputSnapshotStatus.LOCKED:
        raise PayrollSettlementError("Payroll settlement application requires a locked input snapshot.")
    lines = list(settlement.lines.select_related("salary_component").all())
    if not lines:
        raise PayrollSettlementError("Payroll settlements require at least one settlement line before application.")
    for line in lines:
        source_ref = f"settlement-line:{line.id}"
        adjustment, created = PayrollAdjustment.objects.get_or_create(
            tenant=settlement.tenant,
            payroll_run=settlement.payroll_run,
            employee=settlement.employee,
            source_ref=source_ref,
            component_code=line.component_code,
            defaults={
                "input_snapshot": settlement.input_snapshot,
                "salary_component": line.salary_component,
                "kind": _settlement_adjustment_kind(line.line_kind),
                "status": PayrollAdjustmentStatus.APPLIED,
                "direction": line.direction,
                "component_name": line.component_name,
                "amount": line.amount,
                "currency_code": line.currency_code,
                "effective_date": settlement.settlement_date,
                "source_period_start": settlement.payroll_run.period.start_date,
                "source_period_end": settlement.payroll_run.period.end_date,
                "adjustment_profile_ref": settlement.settlement_profile_ref,
                "approval_profile_ref": settlement.approval_profile_ref,
                "reason": f"Applied from settlement {settlement.source_ref}. {settlement.reason}".strip(),
                "submitted_at": settlement.submitted_at or timezone.now(),
                "submitted_by": settlement.submitted_by,
                "approved_at": settlement.approved_at or timezone.now(),
                "approved_by": settlement.approved_by,
                "applied_at": timezone.now(),
                "applied_by": applied_by,
                "source_hash": line.source_hash,
                "config_snapshot": {
                    **line.config_snapshot,
                    "source_system_ref": "payroll.settlement.v1",
                    "settlement_id": str(settlement.id),
                    "settlement_line_id": str(line.id),
                    "settlement_profile_ref": settlement.settlement_profile_ref,
                    "calculation_order": line.calculation_order,
                    "trace_snapshot": line.trace_snapshot,
                },
            },
        )
        if not created and adjustment.status != PayrollAdjustmentStatus.APPLIED:
            raise PayrollSettlementError("Existing settlement adjustment must be applied before settlement application can continue.")
    settlement.status = PayrollSettlementStatus.APPLIED
    settlement.applied_at = timezone.now()
    settlement.applied_by = applied_by
    settlement.totals_snapshot = _settlement_totals(settlement)
    settlement.save()
    return settlement


def _review_profile(payroll_run: PayrollRun) -> dict[str, Any]:
    if not isinstance(payroll_run.config_snapshot, dict):
        return {}
    profile = payroll_run.config_snapshot.get("review_profile", {})
    return profile if isinstance(profile, dict) else {}


def _exception_summary(review: PayrollRunReview) -> dict[str, Any]:
    exceptions = review.exceptions.all()
    open_items = exceptions.filter(status=PayrollExceptionStatus.OPEN)
    return {
        "exception_count": exceptions.count(),
        "open_count": open_items.count(),
        "open_blocker_count": open_items.filter(severity=PayrollExceptionSeverity.BLOCKER).count(),
        "accepted_count": exceptions.filter(status=PayrollExceptionStatus.ACCEPTED).count(),
        "resolved_count": exceptions.filter(status=PayrollExceptionStatus.RESOLVED).count(),
        "rejected_count": exceptions.filter(status=PayrollExceptionStatus.REJECTED).count(),
    }


def _sync_review_snapshots(review: PayrollRunReview) -> PayrollRunReview:
    review.totals_snapshot = review.calculation.totals_snapshot
    review.exception_summary_snapshot = _exception_summary(review)
    review.approval_snapshot = {
        "approval_count": review.approvals.count(),
        "approved_count": review.approvals.filter(status=PayrollApprovalStatus.APPROVED).count(),
        "rejected_count": review.approvals.filter(status=PayrollApprovalStatus.REJECTED).count(),
    }
    review.save()
    return review


def open_payroll_run_review(
    calculation: PayrollRunCalculation,
    *,
    opened_by=None,
    review_profile_ref: str | None = None,
) -> PayrollRunReview:
    """Open or return the review cycle for a completed calculation."""

    if calculation.status != PayrollCalculationStatus.COMPLETED:
        raise PayrollReviewError("Payroll review requires a completed draft calculation.")
    payroll_run = calculation.payroll_run
    if payroll_run.status == PayrollRunStatus.LOCKED:
        raise PayrollReviewError("Final locked payroll runs cannot be reopened for review.")

    profile = _review_profile(payroll_run)
    profile_ref = review_profile_ref or profile.get("review_profile_ref") or "payroll.review.profile.default.v1"
    with transaction.atomic():
        review, created = PayrollRunReview.objects.get_or_create(
            tenant=calculation.tenant,
            payroll_run=payroll_run,
            calculation=calculation,
            defaults={
                "status": PayrollReviewStatus.OPEN,
                "review_profile_ref": profile_ref,
                "opened_by": opened_by,
                "totals_snapshot": calculation.totals_snapshot,
                "config_snapshot": {"review_profile": profile},
            },
        )
        if created:
            for line in calculation.lines.filter(status=PayrollCalculationLineStatus.ERROR).select_related("employee", "input_snapshot"):
                PayrollRunException.objects.create(
                    tenant=calculation.tenant,
                    review=review,
                    payroll_run=payroll_run,
                    calculation_line=line,
                    severity=PayrollExceptionSeverity.BLOCKER,
                    status=PayrollExceptionStatus.OPEN,
                    category="calculation_error",
                    title=f"{line.component_code} calculation failed",
                    detail=line.error_message or "Calculation line failed.",
                    config_snapshot={"source": "calculation_line"},
                )
            warning_count = 0
            for snapshot in payroll_run.input_snapshots.filter(validation_snapshot__isnull=False).select_related("employee"):
                warnings = snapshot.validation_snapshot.get("warnings", []) if isinstance(snapshot.validation_snapshot, dict) else []
                for warning in warnings:
                    if warning_count >= int(profile.get("max_auto_snapshot_warnings", 100)):
                        break
                    PayrollRunException.objects.create(
                        tenant=calculation.tenant,
                        review=review,
                        payroll_run=payroll_run,
                        input_snapshot=snapshot,
                        employee=snapshot.employee,
                        severity=PayrollExceptionSeverity.WARNING,
                        status=PayrollExceptionStatus.OPEN,
                        category="input_warning",
                        title="Input snapshot warning",
                        detail=str(warning),
                        config_snapshot={"source": "input_snapshot.validation_snapshot"},
                    )
                    warning_count += 1
        payroll_run.status = PayrollRunStatus.REVIEW
        payroll_run.save()
        review = _sync_review_snapshots(review)
    return review


def create_payroll_run_exception(
    review: PayrollRunReview,
    *,
    title: str,
    detail: str = "",
    category: str = "manual_review",
    severity: str = PayrollExceptionSeverity.WARNING,
    calculation_line: PayrollCalculationLine | None = None,
    input_snapshot: PayrollInputSnapshot | None = None,
    employee=None,
    created_by=None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollRunException:
    """Create a manual review exception without changing calculation amounts."""

    if review.status == PayrollReviewStatus.LOCKED:
        raise PayrollReviewError("Locked payroll reviews cannot accept new exceptions.")
    exception = PayrollRunException.objects.create(
        tenant=review.tenant,
        review=review,
        payroll_run=review.payroll_run,
        calculation_line=calculation_line,
        input_snapshot=input_snapshot,
        employee=employee,
        category=category,
        severity=severity,
        status=PayrollExceptionStatus.OPEN,
        title=title,
        detail=detail,
        config_snapshot={**(config_snapshot or {}), "created_by": str(created_by) if created_by else ""},
    )
    _sync_review_snapshots(review)
    return exception


def decide_payroll_run_exception(
    exception: PayrollRunException,
    *,
    decision: str,
    reason: str,
    decided_by=None,
) -> PayrollRunException:
    """Accept, resolve, or reject a payroll review exception."""

    if exception.review.status == PayrollReviewStatus.LOCKED:
        raise PayrollReviewError("Locked payroll reviews cannot be changed.")
    if decision not in {
        PayrollExceptionStatus.ACCEPTED,
        PayrollExceptionStatus.RESOLVED,
        PayrollExceptionStatus.REJECTED,
    }:
        raise PayrollReviewError("Unsupported payroll exception decision.")
    exception.status = decision
    exception.decision_reason = reason
    exception.decided_at = timezone.now()
    exception.decided_by = decided_by
    exception.save()
    _sync_review_snapshots(exception.review)
    return exception


def submit_payroll_run_review(review: PayrollRunReview, *, submitted_by=None) -> PayrollRunReview:
    """Mark a payroll review ready for approval after open blockers are cleared."""

    if review.status not in {PayrollReviewStatus.OPEN, PayrollReviewStatus.REJECTED}:
        raise PayrollReviewError("Only open or rejected payroll reviews can be submitted for approval.")
    summary = _exception_summary(review)
    if summary["open_blocker_count"]:
        raise PayrollReviewError("Cannot submit payroll review while blocker exceptions are open.")
    review.status = PayrollReviewStatus.READY_FOR_APPROVAL
    review.submitted_at = timezone.now()
    review.submitted_by = submitted_by
    review.save()
    review.payroll_run.status = PayrollRunStatus.REVIEW
    review.payroll_run.save()
    return _sync_review_snapshots(review)


def approve_payroll_run_review(
    review: PayrollRunReview,
    *,
    approved_by=None,
    comment: str = "",
    approval_profile_ref: str | None = None,
) -> PayrollRunApproval:
    """Approve a submitted payroll review."""

    if review.status != PayrollReviewStatus.READY_FOR_APPROVAL:
        raise PayrollReviewError("Payroll review must be ready for approval before approval.")
    summary = _exception_summary(review)
    if summary["open_blocker_count"]:
        raise PayrollReviewError("Cannot approve payroll review while blocker exceptions are open.")
    approval = PayrollRunApproval.objects.create(
        tenant=review.tenant,
        review=review,
        payroll_run=review.payroll_run,
        approver=approved_by,
        status=PayrollApprovalStatus.APPROVED,
        comment=comment,
        decided_at=timezone.now(),
        approval_profile_ref=approval_profile_ref or "payroll.approval.profile.default.v1",
    )
    review.status = PayrollReviewStatus.APPROVED
    review.approved_at = approval.decided_at
    review.approved_by = approved_by
    review.payroll_run.status = PayrollRunStatus.APPROVED
    review.payroll_run.save()
    _sync_review_snapshots(review)
    return approval


def reject_payroll_run_review(
    review: PayrollRunReview,
    *,
    rejected_by=None,
    comment: str = "",
    approval_profile_ref: str | None = None,
) -> PayrollRunApproval:
    """Reject a submitted payroll review and return it to exception handling."""

    if review.status != PayrollReviewStatus.READY_FOR_APPROVAL:
        raise PayrollReviewError("Payroll review must be ready for approval before rejection.")
    approval = PayrollRunApproval.objects.create(
        tenant=review.tenant,
        review=review,
        payroll_run=review.payroll_run,
        approver=rejected_by,
        status=PayrollApprovalStatus.REJECTED,
        comment=comment,
        decided_at=timezone.now(),
        approval_profile_ref=approval_profile_ref or "payroll.approval.profile.default.v1",
    )
    review.status = PayrollReviewStatus.REJECTED
    review.payroll_run.status = PayrollRunStatus.REVIEW
    review.payroll_run.save()
    _sync_review_snapshots(review)
    return approval


def lock_approved_payroll_run_review(review: PayrollRunReview, *, locked_by=None) -> PayrollRunReview:
    """Final-lock an approved payroll review and payroll run."""

    if review.status != PayrollReviewStatus.APPROVED:
        raise PayrollReviewError("Payroll review must be approved before final lock.")
    summary = _exception_summary(review)
    if summary["open_blocker_count"]:
        raise PayrollReviewError("Cannot lock payroll review while blocker exceptions are open.")
    lock_time = timezone.now()
    review.status = PayrollReviewStatus.LOCKED
    review.locked_at = lock_time
    review.locked_by = locked_by
    review.payroll_run.status = PayrollRunStatus.LOCKED
    review.payroll_run.final_locked_at = lock_time
    review.payroll_run.final_locked_by = locked_by
    review.payroll_run.save()
    return _sync_review_snapshots(review)


def _output_profile(review: PayrollRunReview) -> dict[str, Any]:
    config = review.payroll_run.config_snapshot if isinstance(review.payroll_run.config_snapshot, dict) else {}
    profile = config.get("output_profile", {})
    return profile if isinstance(profile, dict) else {}


def _line_payload(line: PayrollCalculationLine) -> dict[str, Any]:
    return {
        "line_id": str(line.id),
        "line_source": line.line_source,
        "adjustment_id": str(line.adjustment_id) if line.adjustment_id else None,
        "component_code": line.component_code,
        "component_name": line.component_name,
        "line_type": line.line_type,
        "calculation_order": line.calculation_order,
        "amount": str(_round_decimal(line.amount, 2)),
        "currency_code": line.currency_code,
        "rule_code": line.rule_version.rule.code if line.rule_version_id else "",
        "rule_version": line.rule_version.version if line.rule_version_id else None,
        "source_hash": line.source_hash,
        "trace_snapshot": line.trace_snapshot,
        "config_snapshot": line.config_snapshot,
    }


def _employee_totals(lines: list[PayrollCalculationLine]) -> dict[str, Any]:
    totals = {
        "gross_earnings": Decimal("0.00"),
        "employee_deductions": Decimal("0.00"),
        "employer_contributions": Decimal("0.00"),
        "net_pay": Decimal("0.00"),
    }
    for line in lines:
        _apply_line_to_totals(totals, line.line_type, _round_decimal(line.amount, 2))
    return {key: str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) for key, value in totals.items()}


def _artifact_mime_type(kind: str, profile: dict[str, Any]) -> str:
    mime_types = profile.get("mime_types") if isinstance(profile, dict) else {}
    configured = mime_types.get(kind) if isinstance(mime_types, dict) else None
    return configured or ARTIFACT_MIME_TYPES.get(kind, "application/json")


def _artifact_extension(mime_type: str) -> str:
    return ARTIFACT_FILE_EXTENSIONS.get(mime_type, "json")


def _artifact_storage_config(profile: dict[str, Any]) -> dict[str, str]:
    storage_profile = profile.get("storage_profile") if isinstance(profile, dict) else {}
    storage_profile = storage_profile if isinstance(storage_profile, dict) else {}
    return {
        "storage_provider_ref": storage_profile.get("provider_ref")
        or profile.get("storage_provider_ref")
        or "payroll.storage.local.generated.v1",
        "storage_key_prefix": storage_profile.get("key_prefix")
        or profile.get("storage_key_prefix")
        or "payroll",
        "retention_policy_ref": storage_profile.get("retention_policy_ref")
        or profile.get("retention_policy_ref")
        or "payroll.retention.7y.v1",
    }


def _artifact_storage_key(batch: PayrollOutputBatch, kind: str, file_name: str, profile: dict[str, Any]) -> str:
    storage_config = _artifact_storage_config(profile)
    prefix = str(storage_config["storage_key_prefix"]).strip("/") or "payroll"
    profile_ref = batch.output_profile_ref.replace(":", "-").replace("/", "-")
    return f"{prefix}/{batch.payroll_run.code}/{profile_ref}/{kind}/{file_name}"


def _csv_payload(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""
    fieldnames: list[str] = []
    for row in rows:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({
            key: json.dumps(_json_safe(value), sort_keys=True) if isinstance(value, (dict, list)) else _json_safe(value)
            for key, value in row.items()
        })
    return output.getvalue()


def _json_payload(title: str, totals_snapshot: dict[str, Any], line_snapshot: list[dict[str, Any]], config_snapshot: dict[str, Any]) -> str:
    return json.dumps(
        {
            "title": title,
            "totals_snapshot": _json_safe(totals_snapshot),
            "line_snapshot": _json_safe(line_snapshot),
            "config_snapshot": _json_safe(config_snapshot),
        },
        sort_keys=True,
        indent=2,
        default=str,
    )


def _html_payslip_payload(
    *,
    title: str,
    employee_name: str,
    employee_code: str,
    payroll_run_name: str,
    totals_snapshot: dict[str, Any],
    line_snapshot: list[dict[str, Any]],
) -> str:
    rows = "\n".join(
        (
            "<tr>"
            f"<td>{line.get('component_code', '')}</td>"
            f"<td>{line.get('component_name', '')}</td>"
            f"<td>{line.get('line_type', '')}</td>"
            f"<td>{line.get('amount', '')}</td>"
            "</tr>"
        )
        for line in line_snapshot
    )
    total_rows = "\n".join(
        f"<tr><th>{key.replace('_', ' ').title()}</th><td>{value}</td></tr>"
        for key, value in totals_snapshot.items()
    )
    return (
        "<!doctype html><html><head><meta charset=\"utf-8\">"
        f"<title>{title}</title>"
        "<style>body{font-family:Arial,sans-serif;color:#111827;padding:24px}"
        "table{border-collapse:collapse;width:100%;margin-top:16px}"
        "th,td{border:1px solid #dbe3ef;padding:8px;text-align:left}"
        "th{background:#f8fafc}</style></head><body>"
        f"<h1>{title}</h1><p>{payroll_run_name}</p>"
        f"<p><strong>{employee_name}</strong> / {employee_code}</p>"
        f"<h2>Totals</h2><table>{total_rows}</table>"
        "<h2>Pay lines</h2><table><thead><tr><th>Component</th><th>Name</th><th>Type</th><th>Amount</th></tr></thead>"
        f"<tbody>{rows}</tbody></table></body></html>"
    )


def _artifact_file_payload(
    *,
    kind: str,
    title: str,
    totals_snapshot: dict[str, Any],
    line_snapshot: list[dict[str, Any]],
    config_snapshot: dict[str, Any],
    mime_type: str,
    employee_name: str = "",
    employee_code: str = "",
    payroll_run_name: str = "",
) -> str:
    if kind == PayrollOutputArtifactKind.PAYSLIP and mime_type == "text/html":
        return _html_payslip_payload(
            title=title,
            employee_name=employee_name,
            employee_code=employee_code,
            payroll_run_name=payroll_run_name,
            totals_snapshot=totals_snapshot,
            line_snapshot=line_snapshot,
        )
    if mime_type == "text/csv":
        return _csv_payload(line_snapshot)
    return _json_payload(title, totals_snapshot, line_snapshot, config_snapshot)


def _artifact_file_kwargs(
    *,
    batch: PayrollOutputBatch,
    kind: str,
    title: str,
    file_name: str,
    totals_snapshot: dict[str, Any],
    line_snapshot: list[dict[str, Any]],
    config_snapshot: dict[str, Any],
    profile: dict[str, Any],
    employee_name: str = "",
    employee_code: str = "",
) -> dict[str, Any]:
    mime_type = _artifact_mime_type(kind, profile)
    storage_config = _artifact_storage_config(profile)
    payload = _artifact_file_payload(
        kind=kind,
        title=title,
        totals_snapshot=totals_snapshot,
        line_snapshot=line_snapshot,
        config_snapshot=config_snapshot,
        mime_type=mime_type,
        employee_name=employee_name,
        employee_code=employee_code,
        payroll_run_name=batch.payroll_run.name,
    )
    return {
        "file_name": file_name,
        "content_type": mime_type,
        "storage_provider_ref": storage_config["storage_provider_ref"],
        "storage_key": _artifact_storage_key(batch, kind, file_name, profile),
        "mime_type": mime_type,
        "is_downloadable": True,
        "retention_policy_ref": storage_config["retention_policy_ref"],
        "file_payload": payload,
    }


def _sync_output_batch_summary(batch: PayrollOutputBatch) -> PayrollOutputBatch:
    artifacts = batch.artifacts.all()
    batch.artifact_summary_snapshot = {
        "artifact_count": artifacts.count(),
        "payslip_count": artifacts.filter(kind=PayrollOutputArtifactKind.PAYSLIP).count(),
        "register_count": artifacts.filter(kind=PayrollOutputArtifactKind.REGISTER).count(),
        "published_count": artifacts.filter(status=PayrollOutputArtifactStatus.PUBLISHED).count(),
        "voided_count": artifacts.filter(status=PayrollOutputArtifactStatus.VOIDED).count(),
    }
    batch.save()
    return batch


def generate_payroll_outputs(
    review: PayrollRunReview,
    *,
    generated_by=None,
    output_profile_ref: str | None = None,
) -> PayrollOutputBatch:
    """Generate payslip and register artifact snapshots for a final-locked payroll review."""

    if review.status != PayrollReviewStatus.LOCKED:
        raise PayrollOutputError("Payroll outputs require a final-locked payroll review.")
    if review.payroll_run.status != PayrollRunStatus.LOCKED:
        raise PayrollOutputError("Payroll outputs require a final-locked payroll run.")

    profile = _output_profile(review)
    profile_ref = output_profile_ref or profile.get("output_profile_ref") or "payroll.output.profile.default.v1"
    existing = PayrollOutputBatch.objects.filter(
        tenant=review.tenant,
        review=review,
        output_profile_ref=profile_ref,
    ).first()
    if existing:
        if existing.status == PayrollOutputBatchStatus.PUBLISHED:
            raise PayrollOutputError("Published payroll output batches cannot be regenerated.")
        return _sync_output_batch_summary(existing)

    calculation = review.calculation
    lines = list(
        calculation.lines.select_related("employee", "input_snapshot", "rule_version__rule").order_by(
            "employee__employee_code",
            "calculation_order",
            "component_code",
        )
    )
    if not lines:
        raise PayrollOutputError("Payroll outputs require calculation lines.")

    generated_at = timezone.now()
    with transaction.atomic():
        batch = PayrollOutputBatch.objects.create(
            tenant=review.tenant,
            payroll_run=review.payroll_run,
            review=review,
            status=PayrollOutputBatchStatus.GENERATED,
            output_profile_ref=profile_ref,
            generated_at=generated_at,
            generated_by=generated_by,
            totals_snapshot=review.totals_snapshot,
            config_snapshot={
                "output_profile": profile,
                "calculation_id": str(calculation.id),
                "review_id": str(review.id),
            },
        )
        employee_groups: dict[str, list[PayrollCalculationLine]] = {}
        for line in lines:
            employee_groups.setdefault(str(line.employee_id), []).append(line)

        register_rows = []
        for employee_lines in employee_groups.values():
            first_line = employee_lines[0]
            totals = _employee_totals(employee_lines)
            line_payloads = [_line_payload(line) for line in employee_lines]
            employee_code = first_line.employee.employee_code
            artifact_key = f"payslip:{employee_code}"
            payslip_title = f"Payslip - {first_line.employee}"
            payslip_file_name = f"{review.payroll_run.code}-{employee_code}-payslip.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.PAYSLIP, profile))}"
            payslip_config = {
                "artifact_template_ref": profile.get("payslip_template_ref", "payroll.payslip.template.default.v1"),
                "source_hashes": sorted({line.source_hash for line in employee_lines if line.source_hash}),
            }
            PayrollOutputArtifact.objects.create(
                tenant=review.tenant,
                output_batch=batch,
                payroll_run=review.payroll_run,
                review=review,
                employee=first_line.employee,
                input_snapshot=first_line.input_snapshot,
                kind=PayrollOutputArtifactKind.PAYSLIP,
                status=PayrollOutputArtifactStatus.GENERATED,
                artifact_key=artifact_key,
                title=payslip_title,
                output_profile_ref=profile_ref,
                totals_snapshot=totals,
                line_snapshot=line_payloads,
                config_snapshot=payslip_config,
                **_artifact_file_kwargs(
                    batch=batch,
                    kind=PayrollOutputArtifactKind.PAYSLIP,
                    title=payslip_title,
                    file_name=payslip_file_name,
                    totals_snapshot=totals,
                    line_snapshot=line_payloads,
                    config_snapshot=payslip_config,
                    profile=profile,
                    employee_name=str(first_line.employee),
                    employee_code=employee_code,
                ),
            )
            register_rows.append({
                "employee_id": str(first_line.employee_id),
                "employee_code": employee_code,
                "employee_name": str(first_line.employee),
                "input_snapshot_id": str(first_line.input_snapshot_id),
                "source_hash": first_line.source_hash,
                **totals,
            })

        register_title = f"Payroll Register - {review.payroll_run.name}"
        register_file_name = f"{review.payroll_run.code}-payroll-register.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.REGISTER, profile))}"
        register_config = {
            "artifact_template_ref": profile.get("register_template_ref", "payroll.register.template.default.v1"),
            "employee_count": len(register_rows),
        }
        PayrollOutputArtifact.objects.create(
            tenant=review.tenant,
            output_batch=batch,
            payroll_run=review.payroll_run,
            review=review,
            kind=PayrollOutputArtifactKind.REGISTER,
            status=PayrollOutputArtifactStatus.GENERATED,
            artifact_key=f"register:{review.payroll_run.code}",
            title=register_title,
            output_profile_ref=profile_ref,
            totals_snapshot=review.totals_snapshot,
            line_snapshot=register_rows,
            config_snapshot=register_config,
            **_artifact_file_kwargs(
                batch=batch,
                kind=PayrollOutputArtifactKind.REGISTER,
                title=register_title,
                file_name=register_file_name,
                totals_snapshot=review.totals_snapshot,
                line_snapshot=register_rows,
                config_snapshot=register_config,
                profile=profile,
            ),
        )
        batch = _sync_output_batch_summary(batch)
    return batch


def publish_payroll_output_batch(batch: PayrollOutputBatch, *, published_by=None) -> PayrollOutputBatch:
    """Publish generated payroll output artifacts."""

    if batch.status == PayrollOutputBatchStatus.PUBLISHED:
        return batch
    if batch.status != PayrollOutputBatchStatus.GENERATED:
        raise PayrollOutputError("Only generated payroll output batches can be published.")
    if batch.review.status != PayrollReviewStatus.LOCKED or batch.payroll_run.status != PayrollRunStatus.LOCKED:
        raise PayrollOutputError("Payroll outputs can only be published for final-locked payroll.")
    publish_time = timezone.now()
    with transaction.atomic():
        for artifact in batch.artifacts.filter(status=PayrollOutputArtifactStatus.GENERATED):
            artifact.status = PayrollOutputArtifactStatus.PUBLISHED
            artifact.published_at = publish_time
            artifact.published_by = published_by
            artifact.save()
        batch.status = PayrollOutputBatchStatus.PUBLISHED
        batch.published_at = publish_time
        batch.published_by = published_by
        batch = _sync_output_batch_summary(batch)
    return batch


def _finance_handoff_profile(batch: PayrollOutputBatch) -> dict[str, Any]:
    batch_config = batch.config_snapshot if isinstance(batch.config_snapshot, dict) else {}
    run_config = batch.payroll_run.config_snapshot if isinstance(batch.payroll_run.config_snapshot, dict) else {}
    profile = batch_config.get("finance_handoff_profile") or run_config.get("finance_handoff_profile") or {}
    return profile if isinstance(profile, dict) else {}


def _money_from_payload(value: Any) -> Decimal:
    try:
        return _round_decimal(value or "0.00", 2)
    except (PayrollRuleEvaluationError, ValueError):
        return Decimal("0.00")


def _payslip_employee_name(artifact: PayrollOutputArtifact) -> str:
    if not artifact.employee_id:
        return ""
    return " ".join(part for part in [artifact.employee.first_name, artifact.employee.last_name] if part).strip() or artifact.employee.employee_code


def _finance_artifact(
    *,
    batch: PayrollOutputBatch,
    kind: str,
    artifact_key: str,
    title: str,
    file_name: str,
    output_profile_ref: str,
    totals_snapshot: dict[str, Any],
    line_snapshot: list[dict[str, Any]],
    generated_by=None,
    config_snapshot: dict[str, Any] | None = None,
) -> PayrollOutputArtifact:
    artifact = PayrollOutputArtifact.objects.filter(output_batch=batch, kind=kind, artifact_key=artifact_key).first()
    if artifact:
        return artifact
    profile = _finance_handoff_profile(batch)
    artifact_config = {**(config_snapshot or {}), "generated_by": str(generated_by) if generated_by else ""}
    return PayrollOutputArtifact.objects.create(
        tenant=batch.tenant,
        output_batch=batch,
        payroll_run=batch.payroll_run,
        review=batch.review,
        kind=kind,
        status=PayrollOutputArtifactStatus.GENERATED,
        artifact_key=artifact_key,
        title=title,
        output_profile_ref=output_profile_ref,
        totals_snapshot=totals_snapshot,
        line_snapshot=line_snapshot,
        config_snapshot=artifact_config,
        **_artifact_file_kwargs(
            batch=batch,
            kind=kind,
            title=title,
            file_name=file_name,
            totals_snapshot=totals_snapshot,
            line_snapshot=line_snapshot,
            config_snapshot=artifact_config,
            profile=profile,
        ),
    )


def _sync_finance_handoff_summary(handoff: PayrollFinanceHandoff) -> PayrollFinanceHandoff:
    artifacts = PayrollOutputArtifact.objects.filter(
        output_batch=handoff.output_batch,
        kind__in=[
            PayrollOutputArtifactKind.BANK_ADVICE,
            PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
            PayrollOutputArtifactKind.STATUTORY_REPORT,
        ],
    )
    handoff.handoff_summary_snapshot = {
        "artifact_count": artifacts.count(),
        "bank_advice_count": artifacts.filter(kind=PayrollOutputArtifactKind.BANK_ADVICE).count(),
        "accounting_export_count": artifacts.filter(kind=PayrollOutputArtifactKind.ACCOUNTING_EXPORT).count(),
        "statutory_report_count": artifacts.filter(kind=PayrollOutputArtifactKind.STATUTORY_REPORT).count(),
        "published_count": artifacts.filter(status=PayrollOutputArtifactStatus.PUBLISHED).count(),
        "generated_count": artifacts.filter(status=PayrollOutputArtifactStatus.GENERATED).count(),
    }
    handoff.save()
    return handoff


def generate_payroll_finance_handoff(
    batch: PayrollOutputBatch,
    *,
    generated_by=None,
    handoff_profile_ref: str | None = None,
) -> PayrollFinanceHandoff:
    """Generate finance handoff artifacts for a published payroll output batch."""

    if batch.status != PayrollOutputBatchStatus.PUBLISHED:
        raise PayrollFinanceHandoffError("Payroll finance handoff requires a published payroll output batch.")

    profile = _finance_handoff_profile(batch)
    profile_ref = handoff_profile_ref or profile.get("handoff_profile_ref") or "payroll.finance_handoff.profile.default.v1"
    existing = PayrollFinanceHandoff.objects.filter(output_batch=batch, handoff_profile_ref=profile_ref).first()
    if existing:
        return _sync_finance_handoff_summary(existing)

    bank_profile_ref = profile.get("bank_file_profile_ref") or "payroll.bank_file.profile.default.v1"
    accounting_profile_ref = profile.get("accounting_export_profile_ref") or "payroll.accounting_export.profile.default.v1"
    statutory_pack_ref = profile.get("statutory_pack_ref") or "payroll.statutory_pack.default.v1"
    artifact_key_prefix = profile.get("artifact_key_prefix") or f"{batch.payroll_run.code}-{profile_ref}"
    bank_file_name = f"{batch.payroll_run.code}-bank-advice.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.BANK_ADVICE, profile))}"
    accounting_file_name = f"{batch.payroll_run.code}-accounting-export.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.ACCOUNTING_EXPORT, profile))}"
    statutory_file_name = f"{batch.payroll_run.code}-statutory-summary.{_artifact_extension(_artifact_mime_type(PayrollOutputArtifactKind.STATUTORY_REPORT, profile))}"

    payslips = list(
        batch.artifacts.filter(
            kind=PayrollOutputArtifactKind.PAYSLIP,
            status=PayrollOutputArtifactStatus.PUBLISHED,
        ).select_related("employee", "input_snapshot").order_by("employee__employee_code")
    )
    if not payslips:
        raise PayrollFinanceHandoffError("Payroll finance handoff requires published payslip artifacts.")

    bank_rows = []
    accounting_rows = []
    statutory_rows = []
    bank_total = Decimal("0.00")
    accounting_gross = Decimal("0.00")
    accounting_deductions = Decimal("0.00")
    accounting_net = Decimal("0.00")
    statutory_total = Decimal("0.00")

    for payslip in payslips:
        totals = payslip.totals_snapshot if isinstance(payslip.totals_snapshot, dict) else {}
        net_pay = _money_from_payload(totals.get("net_pay"))
        gross_earnings = _money_from_payload(totals.get("gross_earnings"))
        deductions = _money_from_payload(totals.get("employee_deductions"))
        banking = payslip.input_snapshot.banking_snapshot if payslip.input_snapshot_id and isinstance(payslip.input_snapshot.banking_snapshot, dict) else {}
        bank_rows.append({
            "employee_code": payslip.employee.employee_code if payslip.employee_id else "",
            "employee_name": _payslip_employee_name(payslip),
            "net_pay": str(net_pay),
            "currency_code": totals.get("currency_code") or batch.payroll_run.period.calendar.currency_code,
            "banking_snapshot": banking,
            "source_artifact_id": str(payslip.id),
            "source_hash": payslip.source_hash,
        })
        accounting_rows.extend([
            {
                "employee_code": payslip.employee.employee_code if payslip.employee_id else "",
                "line_type": "earning",
                "amount": str(gross_earnings),
                "source_artifact_id": str(payslip.id),
                "source_hash": payslip.source_hash,
            },
            {
                "employee_code": payslip.employee.employee_code if payslip.employee_id else "",
                "line_type": "deduction",
                "amount": str(deductions),
                "source_artifact_id": str(payslip.id),
                "source_hash": payslip.source_hash,
            },
            {
                "employee_code": payslip.employee.employee_code if payslip.employee_id else "",
                "line_type": "net_pay",
                "amount": str(net_pay),
                "source_artifact_id": str(payslip.id),
                "source_hash": payslip.source_hash,
            },
        ])
        for line in payslip.line_snapshot if isinstance(payslip.line_snapshot, list) else []:
            line_type = _normalized_key(line.get("line_type", ""))
            if line_type in {"deduction", "tax", "employer_contribution"}:
                amount = _money_from_payload(line.get("amount"))
                statutory_total += amount
                statutory_rows.append({
                    "employee_code": payslip.employee.employee_code if payslip.employee_id else "",
                    "component_code": line.get("component_code", ""),
                    "component_name": line.get("component_name", ""),
                    "line_type": line.get("line_type", ""),
                    "amount": str(amount),
                    "statutory_treatment_ref": (line.get("config_snapshot") or {}).get("statutory_treatment_ref", ""),
                    "source_line_id": line.get("line_id", ""),
                    "source_hash": line.get("source_hash") or payslip.source_hash,
                })
        bank_total += net_pay
        accounting_gross += gross_earnings
        accounting_deductions += deductions
        accounting_net += net_pay

    with transaction.atomic():
        handoff = PayrollFinanceHandoff.objects.create(
            tenant=batch.tenant,
            output_batch=batch,
            payroll_run=batch.payroll_run,
            review=batch.review,
            status=PayrollFinanceHandoffStatus.GENERATED,
            handoff_profile_ref=profile_ref,
            bank_file_profile_ref=bank_profile_ref,
            accounting_export_profile_ref=accounting_profile_ref,
            statutory_pack_ref=statutory_pack_ref,
            generated_by=generated_by,
            totals_snapshot={
                "gross_earnings": str(accounting_gross),
                "employee_deductions": str(accounting_deductions),
                "net_pay": str(accounting_net),
                "bank_advice_total": str(bank_total),
                "statutory_total": str(statutory_total),
                "employee_count": len(payslips),
            },
            config_snapshot={
                "finance_handoff_profile": profile,
                "source_output_batch_id": str(batch.id),
                "source_output_profile_ref": batch.output_profile_ref,
            },
        )
        _finance_artifact(
            batch=batch,
            kind=PayrollOutputArtifactKind.BANK_ADVICE,
            artifact_key=f"{artifact_key_prefix}-bank-advice",
            title=f"{batch.payroll_run.name} Bank Advice",
            file_name=bank_file_name,
            output_profile_ref=bank_profile_ref,
            totals_snapshot={"net_pay": str(bank_total), "employee_count": len(bank_rows)},
            line_snapshot=bank_rows,
            generated_by=generated_by,
            config_snapshot={"handoff_id": str(handoff.id), "handoff_profile_ref": profile_ref},
        )
        _finance_artifact(
            batch=batch,
            kind=PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
            artifact_key=f"{artifact_key_prefix}-accounting-export",
            title=f"{batch.payroll_run.name} Accounting Export",
            file_name=accounting_file_name,
            output_profile_ref=accounting_profile_ref,
            totals_snapshot={
                "gross_earnings": str(accounting_gross),
                "employee_deductions": str(accounting_deductions),
                "net_pay": str(accounting_net),
                "employee_count": len(payslips),
            },
            line_snapshot=accounting_rows,
            generated_by=generated_by,
            config_snapshot={"handoff_id": str(handoff.id), "handoff_profile_ref": profile_ref},
        )
        _finance_artifact(
            batch=batch,
            kind=PayrollOutputArtifactKind.STATUTORY_REPORT,
            artifact_key=f"{artifact_key_prefix}-statutory-report",
            title=f"{batch.payroll_run.name} Statutory Summary",
            file_name=statutory_file_name,
            output_profile_ref=statutory_pack_ref,
            totals_snapshot={"statutory_total": str(statutory_total), "line_count": len(statutory_rows)},
            line_snapshot=statutory_rows,
            generated_by=generated_by,
            config_snapshot={"handoff_id": str(handoff.id), "handoff_profile_ref": profile_ref},
        )
        handoff = _sync_finance_handoff_summary(handoff)
    return handoff


def transmit_payroll_finance_handoff(handoff: PayrollFinanceHandoff, *, transmitted_by=None) -> PayrollFinanceHandoff:
    """Mark a generated finance handoff as transmitted and publish its finance artifacts."""

    if handoff.status == PayrollFinanceHandoffStatus.TRANSMITTED:
        return handoff
    if handoff.status != PayrollFinanceHandoffStatus.GENERATED:
        raise PayrollFinanceHandoffError("Only generated payroll finance handoffs can be transmitted.")
    if handoff.output_batch.status != PayrollOutputBatchStatus.PUBLISHED:
        raise PayrollFinanceHandoffError("Payroll finance handoff requires a published payroll output batch.")

    with transaction.atomic():
        for artifact in PayrollOutputArtifact.objects.filter(
            output_batch=handoff.output_batch,
            kind__in=[
                PayrollOutputArtifactKind.BANK_ADVICE,
                PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
                PayrollOutputArtifactKind.STATUTORY_REPORT,
            ],
            status=PayrollOutputArtifactStatus.GENERATED,
        ):
            artifact.status = PayrollOutputArtifactStatus.PUBLISHED
            artifact.published_by = transmitted_by
            artifact.save()
        handoff.status = PayrollFinanceHandoffStatus.TRANSMITTED
        handoff.transmitted_at = timezone.now()
        handoff.transmitted_by = transmitted_by
        handoff = _sync_finance_handoff_summary(handoff)
    return handoff
