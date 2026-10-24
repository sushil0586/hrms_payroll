"""Guarded synthetic datasets for current-source Leave browser certification."""

import json
import os
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from django.apps import apps
from django.utils import timezone


def _workspace(manifest_path: str):
    database = os.environ.get("POSTGRES_DB", "")
    host = os.environ.get("POSTGRES_HOST", "")
    if not database.startswith("hrms_") or host not in {"127.0.0.1", "localhost"}:
        raise RuntimeError("Leave fixtures require an explicitly named local PostgreSQL database.")
    path = Path(manifest_path)
    manifest = json.loads(path.read_text())
    tenant = apps.get_model("tenants.Tenant").objects.get(pk=manifest["tenant"]["id"])
    if not tenant.is_sandbox or not tenant.code.startswith("pw-qa-") or manifest.get("ownership", {}).get("owner") != "playwright":
        raise RuntimeError("Refusing to seed a workspace that is not Playwright-owned and synthetic.")
    return path, manifest, tenant


def prepare_applications(manifest_path: str) -> None:
    path, manifest, tenant = _workspace(manifest_path)
    Employee = apps.get_model("employees.Employee")
    LeaveRequest = apps.get_model("leave_management.LeaveRequest")
    employee = Employee.objects.get(pk=manifest["credentials"]["employee"]["employee_id"], tenant=tenant)
    leave_policy = tenant.leave_policies.get(pk=manifest["leave"]["policy_id"])
    leave_type = leave_policy.leave_type
    marker = {"owner": "playwright", "suite": "leave-applications"}
    base_date = date(2026, 9, 1)
    rows = []
    for index in range(32):
        request_date = base_date + timedelta(days=index)
        rows.append(LeaveRequest(
            tenant=tenant,
            employee=employee,
            leave_type=leave_type,
            leave_policy=leave_policy,
            status="rejected",
            start_date=request_date,
            end_date=request_date,
            requested_units=Decimal("1.00"),
            approved_units=Decimal("0.00"),
            reason=f"QA leave pagination {index:02d}",
            rejection_reason="Synthetic rejected request for pagination coverage",
            manager_comment="Rejected by guarded Playwright fixture",
            workflow_reference="",
            applied_at=timezone.now(),
            metadata=marker,
        ))
    LeaveRequest.objects.bulk_create(rows)
    manifest["leave_applications"] = {
        "rejected_count": 32,
        "search_reason": "QA leave pagination 00",
    }
    path.write_text(json.dumps(manifest, indent=2) + "\n")


def prepare_setup(manifest_path: str, foreign_manifest_path: str) -> None:
    path, manifest, tenant = _workspace(manifest_path)
    _, foreign_manifest, foreign_tenant = _workspace(foreign_manifest_path)
    Employee = apps.get_model("employees.Employee")
    Assignment = apps.get_model("leave_management.LeavePolicyAssignment")
    employee = Employee.objects.get(pk=manifest["credentials"]["employee"]["employee_id"], tenant=tenant)
    policy = tenant.leave_policies.get(pk=manifest["leave"]["policy_id"])
    for index in range(14):
        Assignment.objects.create(
            tenant=tenant, leave_policy=policy, legal_entity=employee.legal_entity,
            priority=500 + index, is_active=False,
            effective_from=date(2027 + index, 1, 1), effective_to=date(2027 + index, 12, 31),
            resolution_snapshot={"owner": "playwright", "suite": "leave-setup"},
        )

    # A view-only foreign HR persona exercises both UI and API mutation denial.
    RolePermission = apps.get_model("iam.RolePermission")
    foreign_role = foreign_tenant.roles.get(code="hr-admin")
    RolePermission.objects.filter(role=foreign_role, permission_key__in=[
        "leave.policies.manage", "employees.create", "employees.edit", "organization.manage",
    ]).delete()
    manifest["leave_setup"] = {"inactive_assignment_count": 14, "foreign_tenant": foreign_manifest["tenant"]["id"]}
    path.write_text(json.dumps(manifest, indent=2) + "\n")


def prepare_balances(manifest_path: str, foreign_manifest_path: str) -> None:
    path, manifest, tenant = _workspace(manifest_path)
    _, foreign_manifest, foreign_tenant = _workspace(foreign_manifest_path)
    Employee = apps.get_model("employees.Employee")
    Period = apps.get_model("leave_management.LeavePolicyPeriod")
    Balance = apps.get_model("leave_management.LeaveBalance")
    Transaction = apps.get_model("leave_management.LeaveBalanceTransaction")
    RolePermission = apps.get_model("iam.RolePermission")
    employees = list(Employee.objects.filter(tenant=tenant).order_by("employee_code"))
    employee = Employee.objects.get(pk=manifest["credentials"]["employee"]["employee_id"], tenant=tenant)
    checker = Employee.objects.get(pk=manifest["credentials"]["hr_checker"]["employee_id"], tenant=tenant)
    policy = tenant.leave_policies.get(pk=manifest["leave"]["policy_id"])
    base_balance = tenant.leave_balances.get(pk=manifest["leave"]["balance_id"])
    marker = {"owner": "playwright", "suite": "leave-balances"}

    created_balances = []
    # Eleven additional balances for the target employee plus nineteen across
    # other employees produce the exact 31-row independent-pagination dataset.
    secondary = [item for item in employees if item.pk not in {employee.pk, checker.pk}]
    owners = [employee] * 11 + [item for item in secondary for _ in range(5)][:19]
    for offset, owner in enumerate(owners, start=1):
        year = 2026 + offset
        period = Period.objects.create(
            tenant=tenant, leave_policy=policy, legal_entity=owner.legal_entity,
            code=f"QA-BAL-{year}-{owner.employee_code}", start_date=date(year, 1, 1),
            end_date=date(year, 12, 31), status="open", policy_snapshot=marker,
        )
        created_balances.append(Balance.objects.create(
            tenant=tenant, employee=owner, leave_policy=policy, policy_period=period,
            period_year=year, opening_balance=Decimal("12.00"), closing_balance=Decimal("12.00"),
            ledger_checksum="playwright-fixture",
        ))

    rejected = [Transaction(
        tenant=tenant, leave_balance=base_balance, employee=employee, leave_policy=policy,
        policy_period=base_balance.policy_period, status="rejected", action="debit_adjustment",
        units=Decimal("0.25"), delta_units=Decimal("0.00"), effective_date=date(2026, 10, 20),
        reason=f"QA rejected balance transaction {index + 1:02d}", performed_by=checker,
        rejection_reason="Synthetic rejected ledger review", closing_balance_before=base_balance.closing_balance,
        closing_balance_after=base_balance.closing_balance, metadata=marker,
    ) for index in range(32)]
    Transaction.objects.bulk_create(rejected)
    pending = [Transaction.objects.create(
        tenant=tenant, leave_balance=base_balance, employee=employee, leave_policy=policy,
        policy_period=base_balance.policy_period, status="pending", action="debit_adjustment",
        units=Decimal("0.25"), delta_units=Decimal("0.00"), effective_date=date(2026, 10, 20),
        reason=f"QA pending maker-checker transaction {index + 1}", performed_by=checker,
        closing_balance_before=base_balance.closing_balance,
        closing_balance_after=Decimal(base_balance.closing_balance) - Decimal("0.25"), metadata=marker,
    ) for index in range(2)]

    foreign_transaction = foreign_tenant.leave_balance_transactions.first()
    foreign_role = foreign_tenant.roles.get(code="hr-admin")
    RolePermission.objects.filter(role=foreign_role, permission_key__in=["leave.balances.manage"]).delete()
    manifest["balance_qa"] = {
        "pending_ids": [str(item.pk) for item in pending],
        "foreign_transaction_id": str(foreign_transaction.pk),
        "balance_count": 31,
        "rejected_transaction_count": 32,
        "foreign_tenant": foreign_manifest["tenant"]["id"],
    }
    path.write_text(json.dumps(manifest, indent=2) + "\n")


def prepare_completion(manifest_path: str) -> dict:
    path, manifest, tenant = _workspace(manifest_path)
    Employee = apps.get_model("employees.Employee")
    LeaveRequest = apps.get_model("leave_management.LeaveRequest")
    Assignment = apps.get_model("leave_management.LeavePolicyAssignment")
    employee = Employee.objects.get(pk=manifest["credentials"]["employee"]["employee_id"], tenant=tenant)
    policy = tenant.leave_policies.get(pk=manifest["leave"]["policy_id"])
    leave_type = policy.leave_type
    common = dict(
        tenant=tenant, employee=employee, leave_type=leave_type, leave_policy=policy,
        status="rejected", requested_units=Decimal("1.00"), approved_units=Decimal("0.00"),
        workflow_reference="", metadata={"owner": "playwright", "suite": "leave-completion"},
    )
    needle = LeaveRequest.objects.create(
        **common, start_date=date(2026, 1, 15), end_date=date(2026, 1, 17),
        reason="Needle beyond first page", rejection_reason="Synthetic history fixture",
    )
    for index in range(24):
        LeaveRequest.objects.create(
            **common, start_date=date(2026, 10, 1) + timedelta(days=index % 20),
            end_date=date(2026, 10, 1) + timedelta(days=index % 20),
            reason=f"Global filler {index + 1:02d}", rejection_reason="Synthetic history fixture",
        )
    for index in range(14):
        LeaveRequest.objects.create(
            **common, start_date=date(2024, 2, 28), end_date=date(2024, 3, 1),
            reason=f"Calendar complete {index + 1:02d}", rejection_reason="Synthetic calendar fixture",
        )

    employee_values = {
        field: getattr(employee, field) for field in [
            "legal_entity", "branch", "location", "department", "business_unit",
            "cost_center", "designation", "grade", "employment_type", "reporting_manager",
        ]
    }
    exact = Employee.objects.create(
        tenant=tenant, employee_code="PHASE1-EXACT", first_name="Phase One", last_name="Exact",
        preferred_name="Exact", date_of_joining=date(2024, 1, 1), employment_status="active", **employee_values,
    )
    dated = Employee.objects.create(
        tenant=tenant, employee_code="PHASE1-DATED", first_name="Phase One", last_name="Dated",
        preferred_name="Dated", date_of_joining=date(2024, 1, 1), employment_status="active", **employee_values,
    )
    for index in range(30):
        Employee.objects.create(
            tenant=tenant, employee_code=f"PHASE1-SIMILAR-{index:03d}", first_name="Phase One",
            last_name=f"Similar {index:03d}", date_of_joining=date(2024, 1, 1),
            employment_status="active", **employee_values,
        )
    Assignment.objects.create(
        tenant=tenant, leave_policy=policy, employee=dated, priority=777, is_active=True,
        effective_from=date(2026, 1, 1), effective_to=date(2026, 6, 30),
        resolution_snapshot={"owner": "playwright", "suite": "leave-completion"},
    )
    result = {
        "dated_id": str(dated.pk), "dated_code": dated.employee_code,
        "needle_id": str(needle.pk), "policy_name": policy.name, "type_code": leave_type.code,
        "exact_id": str(exact.pk), "exact_code": exact.employee_code,
        "employee_code": employee.employee_code,
        "hr_code": manifest["credentials"]["hr_checker"]["employee_code"], "today": "2026-10-23",
    }
    manifest["leave_completion"] = result
    path.write_text(json.dumps(manifest, indent=2) + "\n")
    return result


def prepare_visual(manifest_path: str) -> None:
    prepare_completion(manifest_path)


def prepare_final(manifest_path: str) -> None:
    """Build the deterministic report and leave-year rollover dataset."""
    path, manifest, tenant = _workspace(manifest_path)
    Employee = apps.get_model("employees.Employee")
    Period = apps.get_model("leave_management.LeavePolicyPeriod")
    Balance = apps.get_model("leave_management.LeaveBalance")
    employee = Employee.objects.get(pk=manifest["credentials"]["employee"]["employee_id"], tenant=tenant)
    policy = tenant.leave_policies.get(pk=manifest["leave"]["policy_id"])
    base_balance = tenant.leave_balances.get(pk=manifest["leave"]["balance_id"])
    marker = {"owner": "playwright", "suite": "leave-final"}

    employee_values = {
        field: getattr(employee, field) for field in [
            "legal_entity", "branch", "location", "department", "business_unit",
            "cost_center", "designation", "grade", "employment_type", "reporting_manager",
        ]
    }
    report_employees = [Employee.objects.create(
        tenant=tenant, employee_code=f"QA-REPORT-{index:03d}", first_name="QA Report",
        last_name=f"{index:03d}", preferred_name=f"QA-REPORT-{index:03d}",
        date_of_joining=date(2024, 1, 1), employment_status="active", **employee_values,
    ) for index in range(55)]
    Balance.objects.bulk_create([Balance(
        tenant=tenant, employee=item, leave_policy=policy,
        policy_period=base_balance.policy_period, period_year=base_balance.period_year,
        opening_balance=Decimal("12.00"), accrued_amount=Decimal("3.00"),
        consumed_amount=Decimal(index % 5), reserved_amount=Decimal(index % 2),
        closing_balance=Decimal("15.00") - Decimal(index % 5) - Decimal(index % 2),
        ledger_checksum="playwright-leave-final",
    ) for index, item in enumerate(report_employees)])

    source = Period.objects.create(
        tenant=tenant, leave_policy=policy, legal_entity=employee.legal_entity,
        code="QA-SOURCE", start_date=date(2030, 1, 1), end_date=date(2030, 12, 31),
        status="open", policy_snapshot=marker,
    )
    target = Period.objects.create(
        tenant=tenant, leave_policy=policy, legal_entity=employee.legal_entity,
        code="QA-TARGET", start_date=date(2031, 1, 1), end_date=date(2031, 12, 31),
        status="open", policy_snapshot=marker,
    )
    Balance.objects.create(
        tenant=tenant, employee=employee, leave_policy=policy, policy_period=source,
        period_year=2030, opening_balance=Decimal("18.00"), closing_balance=Decimal("18.00"),
        ledger_checksum="playwright-leave-final-source",
    )
    manifest["leave_final"] = {"source": str(source.pk), "target": str(target.pk)}
    path.write_text(json.dumps(manifest, indent=2) + "\n")
