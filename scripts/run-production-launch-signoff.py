#!/usr/bin/env python3
"""Run the HRMS/payroll SaaS launch sign-off gate and write evidence artifacts."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shlex
import subprocess
import sys
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
WEB = ROOT / "web"
DEFAULT_PYTHON = ROOT / ".venv" / "bin" / "python"
DEFAULT_STAGING_SEED_MANIFEST = WEB / "qa-artifacts" / "staging-launch-seed" / "manifest.json"
LIVE_HANDLE_KEYS = (
    "PLAYWRIGHT_LIVE_RETRY_NOTIFICATION_ID",
    "PLAYWRIGHT_LIVE_EMPLOYEE_NOTIFICATION_ID",
    "PLAYWRIGHT_LIVE_PAYSLIP_ID",
)
PRODUCTION_SUITES = [
    "tests/e2e/production-payroll-close-flows.spec.ts",
    "tests/e2e/production-payroll-negative-controls.spec.ts",
    "tests/e2e/production-provider-callback-flows.spec.ts",
    "tests/e2e/production-storage-governance-flows.spec.ts",
    "tests/e2e/production-tenant-role-isolation.spec.ts",
    "tests/e2e/production-notification-flows.spec.ts",
    "tests/e2e/production-responsive-visual-gate.spec.ts",
    "tests/e2e/production-live-mutation-readiness.spec.ts",
    "tests/e2e/production-launch-release-gate.spec.ts",
]
BACKEND_LAUNCH_TEST_SELECTOR = (
    "hr_admin_dashboard_returns_saas_launch_audit or "
    "rehearse_hrms_saas_launch_command_exports_actionable_audit_pack or "
    "hr_admin_can_download_hrms_saas_launch_audit_pack or "
    "hr_admin_can_manage_launch_remediation_assignment_lifecycle or "
    "hrms_launch_remediation_sla_processor_sends_reminders_and_escalations or "
    "hr_admin_saas_control_plane_returns_entitlements_and_usage or "
    "commercial_profile_override_adds_launch_blocker_for_missing_required_entitlement or "
    "snapshot_saas_commercial_usage_command_records_meter_history or "
    "hr_admin_can_record_payroll_provider_launch_rehearsal_history or "
    "payroll_provider_launch_rehearsal_proves_three_lane_production_readiness or "
    "rehearse_payroll_provider_launch_command_exports_blocked_audit_pack or "
    "rehearse_payroll_provider_launch_command_passes_ready_three_lane_tenant"
)
ENV_CHECKS = [
    {
        "key": "HRMS_API_BASE_URL",
        "local_required": False,
        "staging_required": True,
        "production_required": True,
        "purpose": "Live backend API target for browser proxy routes.",
    },
    {
        "key": "HRMS_API_BEARER_TOKEN",
        "local_required": False,
        "staging_required": False,
        "production_required": False,
        "purpose": "Optional API bearer token for non-cookie automation.",
    },
    {
        "key": "PLAYWRIGHT_LIVE_SEED_PASSWORD",
        "local_required": False,
        "staging_required": True,
        "production_required": False,
        "purpose": "Seeded operator password for staging browser runs.",
    },
    {
        "key": "PLAYWRIGHT_LIVE_MUTATIONS",
        "local_required": False,
        "staging_required": False,
        "production_required": False,
        "purpose": "Opt-in flag for disposable live mutation execution.",
        "expected": "true",
    },
    {
        "key": "PLAYWRIGHT_LIVE_RETRY_NOTIFICATION_ID",
        "local_required": False,
        "staging_required": False,
        "production_required": False,
        "purpose": "Disposable failed notification id for live mutation opt-in.",
    },
    {
        "key": "PLAYWRIGHT_LIVE_EMPLOYEE_NOTIFICATION_ID",
        "local_required": False,
        "staging_required": False,
        "production_required": False,
        "purpose": "Disposable employee notification id for live mutation opt-in.",
    },
    {
        "key": "PLAYWRIGHT_LIVE_PAYSLIP_ID",
        "local_required": False,
        "staging_required": False,
        "production_required": False,
        "purpose": "Disposable payslip id for live read-receipt opt-in.",
    },
    {
        "key": "HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON",
        "local_required": False,
        "staging_required": False,
        "production_required": True,
        "purpose": "Runtime payroll provider credential refs loaded from a secret manager.",
    },
    {
        "key": "HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON",
        "local_required": False,
        "staging_required": False,
        "production_required": True,
        "purpose": "Runtime payroll artifact storage credential refs.",
    },
    {
        "key": "HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON",
        "local_required": False,
        "staging_required": False,
        "production_required": True,
        "purpose": "Tenant payroll artifact storage policy registry.",
    },
    {
        "key": "PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE",
        "local_required": False,
        "staging_required": False,
        "production_required": True,
        "purpose": "Strict storage/IAM/KMS/lifecycle/malware/durability verification mode.",
        "expected": "strict",
    },
]
PRODUCTION_EXCEPTIONS = [
    "Real payroll provider credentials/transports must be validated with official sandbox or production runbooks.",
    "Real SSO/MFA/SCIM identity-provider execution must be validated for enabled enterprise tenants.",
    "Real email/SMS/notification provider delivery must be validated outside local demo mode.",
    "Object storage IAM, KMS, lifecycle, malware scan, durability, and signed URL behavior must be verified in the target environment.",
    "Backup/restore, monitoring, alerting, and incident-response runbooks must be executed in the target environment.",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tenant-code", default="northstar-foods", help="Tenant code used for backend rehearsal commands.")
    parser.add_argument("--mode", choices=["local", "staging", "production"], default="local", help="How strictly to interpret env posture.")
    parser.add_argument("--artifact-dir", default="", help="Override artifact directory.")
    parser.add_argument("--python", default=str(DEFAULT_PYTHON if DEFAULT_PYTHON.exists() else "python3"), help="Python executable for Django/pytest.")
    parser.add_argument("--skip-static", action="store_true", help="Skip web typecheck/lint.")
    parser.add_argument("--skip-backend-checks", action="store_true", help="Skip Django check and migration dry-run.")
    parser.add_argument("--skip-backend-tests", action="store_true", help="Skip backend pytest launch subset.")
    parser.add_argument("--skip-browser", action="store_true", help="Skip production Playwright suites A-I.")
    parser.add_argument("--skip-management-commands", action="store_true", help="Skip launch/provider/commercial management commands.")
    parser.add_argument("--preflight-only", action="store_true", help="Only write env posture and launch exceptions without running checks.")
    parser.add_argument("--allow-command-failures", action="store_true", help="Write reports and exit 0 even when checks fail.")
    parser.add_argument(
        "--seed-manifest",
        default="",
        help="Optional staging seed manifest. In staging mode, the default manifest is used when present.",
    )
    return parser.parse_args()


def now_utc() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slug_time() -> str:
    return dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")


def shell_join(command: Iterable[str]) -> str:
    return " ".join(shlex.quote(part) for part in command)


def log(message: str) -> None:
    print(message, flush=True)


def display_path(path: Path) -> str:
    return os.path.relpath(path, ROOT)


def run_step(name: str, command: list[str], cwd: Path, logs_dir: Path, env: dict[str, str]) -> dict[str, object]:
    started_at = now_utc()
    log(f"[launch-signoff] {name}: {shell_join(command)}")
    result = subprocess.run(command, cwd=cwd, env=env, text=True, capture_output=True, check=False)
    completed_at = now_utc()
    log_name = f"{name.lower().replace(' ', '-').replace('/', '-')}.log"
    log_path = logs_dir / log_name
    log_path.write_text(
        "\n".join(
            [
                f"$ {shell_join(command)}",
                f"cwd: {cwd}",
                f"started_at: {started_at}",
                f"completed_at: {completed_at}",
                f"exit_code: {result.returncode}",
                "",
                "## stdout",
                result.stdout,
                "",
                "## stderr",
                result.stderr,
            ]
        ),
        encoding="utf-8",
    )
    status = "passed" if result.returncode == 0 else "failed"
    log(f"[launch-signoff] {name}: {status}")
    return {
        "name": name,
        "command": command,
        "cwd": str(cwd),
        "status": status,
        "exit_code": result.returncode,
        "started_at": started_at,
        "completed_at": completed_at,
        "log_path": display_path(log_path),
    }


def resolve_manifest_path(value: str) -> Path:
    path = Path(value).expanduser()
    if path.is_absolute():
        return path
    return (ROOT / path).resolve()


def apply_seed_manifest(mode: str, manifest_arg: str, env: dict[str, str]) -> dict[str, object]:
    explicit_manifest = bool(manifest_arg)
    manifest_path: Path | None = resolve_manifest_path(manifest_arg) if explicit_manifest else None
    if manifest_path is None and mode == "staging" and DEFAULT_STAGING_SEED_MANIFEST.exists():
        manifest_path = DEFAULT_STAGING_SEED_MANIFEST

    if manifest_path is None:
        return {
            "status": "not_requested",
            "path": "",
            "configured_keys": [],
            "missing_keys": [],
            "live_mutations_source": "environment" if env.get("PLAYWRIGHT_LIVE_MUTATIONS") else "",
        }
    if not manifest_path.exists():
        return {
            "status": "missing",
            "path": display_path(manifest_path),
            "configured_keys": [],
            "missing_keys": list(LIVE_HANDLE_KEYS),
            "live_mutations_source": "environment" if env.get("PLAYWRIGHT_LIVE_MUTATIONS") else "",
        }

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return {
            "status": "invalid_json",
            "path": display_path(manifest_path),
            "configured_keys": [],
            "missing_keys": list(LIVE_HANDLE_KEYS),
            "error": str(exc),
            "live_mutations_source": "environment" if env.get("PLAYWRIGHT_LIVE_MUTATIONS") else "",
        }

    handles = manifest.get("handles", {})
    if not isinstance(handles, dict):
        handles = {}

    configured_keys: list[str] = []
    missing_keys: list[str] = []
    for key in LIVE_HANDLE_KEYS:
        value = env.get(key) or handles.get(key)
        if value:
            env[key] = str(value)
            configured_keys.append(key)
        else:
            missing_keys.append(key)

    live_mutations_source = "environment" if env.get("PLAYWRIGHT_LIVE_MUTATIONS") == "true" else ""
    if configured_keys and mode == "staging" and env.get("PLAYWRIGHT_LIVE_MUTATIONS") != "true":
        env["PLAYWRIGHT_LIVE_MUTATIONS"] = "true"
        live_mutations_source = "seed_manifest"

    return {
        "status": "applied" if not missing_keys else "partial",
        "path": display_path(manifest_path),
        "seed_ref": manifest.get("seed_ref", ""),
        "tenant_code": manifest.get("tenant_code", ""),
        "employee_code": manifest.get("employee_code", ""),
        "configured_keys": configured_keys,
        "missing_keys": missing_keys,
        "live_mutations_source": live_mutations_source,
    }


def env_posture(mode: str, env: dict[str, str]) -> list[dict[str, object]]:
    live_mutations = env.get("PLAYWRIGHT_LIVE_MUTATIONS") == "true"
    rows: list[dict[str, object]] = []
    for check in ENV_CHECKS:
        key = str(check["key"])
        value = env.get(key, "")
        required = bool(check[f"{mode}_required"])
        if key in LIVE_HANDLE_KEYS:
            required = required or (mode == "staging" and live_mutations)
        configured = bool(value)
        expected = str(check.get("expected", ""))
        expected_match = not expected or value == expected
        status = "configured" if configured and expected_match else "missing"
        if configured and not expected_match:
            status = "mismatched"
        if not required and not configured:
            status = "not_required_for_mode"
        rows.append(
            {
                "key": key,
                "status": status,
                "required_for_mode": required,
                "expected": expected,
                "purpose": check["purpose"],
            }
        )
    return rows


def decide_status(mode: str, steps: list[dict[str, object]], posture: list[dict[str, object]], *, preflight_only: bool) -> str:
    if any(step["status"] != "passed" for step in steps):
        return "LOCAL CONTRACT FAILED" if mode == "local" else "LAUNCH GATE FAILED"
    missing_required = [row for row in posture if row["required_for_mode"] and row["status"] != "configured"]
    if missing_required:
        if preflight_only:
            return "STAGING PREFLIGHT BLOCKED" if mode == "staging" else "PRODUCTION PREFLIGHT BLOCKED"
        return "STAGING BLOCKED" if mode == "staging" else "PRODUCTION BLOCKED"
    if preflight_only:
        if mode == "production":
            return "PRODUCTION PREFLIGHT PASS"
        if mode == "staging":
            return "STAGING PREFLIGHT PASS"
        return "LOCAL PREFLIGHT PASS"
    if mode == "production":
        return "PRODUCTION READY - AUTOMATION PASS"
    if mode == "staging":
        return "PILOT READY - STAGING CONTRACT PASS"
    return "LOCAL CONTRACT PASS"


def markdown_report(report: dict[str, object]) -> str:
    steps = report["steps"]
    posture = report["environment_posture"]
    seed_manifest = report["seed_manifest"]
    lines = [
        "# HRMS Payroll SaaS Launch Sign-Off",
        "",
        f"Generated: {report['generated_at']}",
        f"Mode: `{report['mode']}`",
        f"Tenant: `{report['tenant_code']}`",
        f"Preflight only: `{str(report['preflight_only']).lower()}`",
        f"Decision: `{report['decision']}`",
        "",
        "## Command Results",
        "",
        "| Step | Status | Exit | Log |",
        "|---|---|---:|---|",
    ]
    if steps:
        for step in steps:
            lines.append(f"| {step['name']} | `{step['status']}` | {step['exit_code']} | `{step['log_path']}` |")
    else:
        lines.append("| No commands executed | `preflight_only` | 0 |  |")
    lines.extend(
        [
            "",
            "## Environment Posture",
            "",
            "| Key | Status | Required | Expected | Purpose |",
            "|---|---|---|---|---|",
        ]
    )
    for row in posture:
        required = "yes" if row["required_for_mode"] else "no"
        expected = row["expected"] or ""
        lines.append(f"| `{row['key']}` | `{row['status']}` | {required} | `{expected}` | {row['purpose']} |")
    lines.extend(["", "## Seed Manifest", ""])
    lines.append(f"- Status: `{seed_manifest['status']}`")
    if seed_manifest["path"]:
        lines.append(f"- Path: `{seed_manifest['path']}`")
    if seed_manifest.get("seed_ref"):
        lines.append(f"- Seed ref: `{seed_manifest['seed_ref']}`")
    if seed_manifest.get("tenant_code"):
        lines.append(f"- Tenant: `{seed_manifest['tenant_code']}`")
    configured_keys = seed_manifest.get("configured_keys", [])
    missing_keys = seed_manifest.get("missing_keys", [])
    if configured_keys:
        lines.append(f"- Configured handle keys: `{', '.join(configured_keys)}`")
    if missing_keys:
        lines.append(f"- Missing handle keys: `{', '.join(missing_keys)}`")
    if seed_manifest.get("live_mutations_source"):
        lines.append(f"- Live mutations source: `{seed_manifest['live_mutations_source']}`")
    lines.extend(["", "## Production Exceptions", ""])
    for exception in report["production_exceptions"]:
        lines.append(f"- {exception}")
    lines.extend(
        [
            "",
            "## Artifact Files",
            "",
            f"- JSON report: `{report['json_report_path']}`",
            f"- Markdown report: `{report['markdown_report_path']}`",
            f"- Command logs: `{report['logs_dir']}`",
            f"- Management command outputs: `{report['management_outputs_dir']}`",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    artifact_dir = Path(args.artifact_dir) if args.artifact_dir else WEB / "qa-artifacts" / f"production-launch-signoff-{slug_time()}"
    artifact_dir = artifact_dir.resolve()
    logs_dir = artifact_dir / "logs"
    management_outputs_dir = artifact_dir / "management-outputs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    management_outputs_dir.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    seed_manifest = apply_seed_manifest(args.mode, args.seed_manifest, env)
    steps: list[dict[str, object]] = []

    if args.preflight_only:
        args.skip_backend_checks = True
        args.skip_backend_tests = True
        args.skip_browser = True
        args.skip_management_commands = True
        args.skip_static = True

    if not args.skip_backend_checks:
        steps.append(run_step("django check", [args.python, "manage.py", "check"], BACKEND, logs_dir, env))
        steps.append(run_step("django migrations dry run", [args.python, "manage.py", "makemigrations", "--check", "--dry-run"], BACKEND, logs_dir, env))

    if not args.skip_management_commands:
        steps.append(
            run_step(
                "hrms launch audit command",
                [
                    args.python,
                    "manage.py",
                    "rehearse_hrms_saas_launch",
                    "--tenant-code",
                    args.tenant_code,
                    "--output-file",
                    str(management_outputs_dir / "hrms-saas-launch-audit.json"),
                    "--allow-blocked",
                ],
                BACKEND,
                logs_dir,
                env,
            )
        )
        steps.append(
            run_step(
                "payroll provider launch rehearsal command",
                [
                    args.python,
                    "manage.py",
                    "rehearse_payroll_provider_launch",
                    "--tenant-code",
                    args.tenant_code,
                    "--output-file",
                    str(management_outputs_dir / "payroll-provider-launch-audit.json"),
                    "--allow-blocked",
                ],
                BACKEND,
                logs_dir,
                env,
            )
        )
        steps.append(
            run_step(
                "saas commercial usage snapshot command",
                [
                    args.python,
                    "manage.py",
                    "snapshot_saas_commercial_usage",
                    "--tenant-code",
                    args.tenant_code,
                    "--source-ref",
                    "qa.launch_signoff.suite_j.v1",
                ],
                BACKEND,
                logs_dir,
                env,
            )
        )

    if not args.skip_backend_tests:
        steps.append(
            run_step(
                "backend launch rehearsal tests",
                [args.python, "-m", "pytest", "tests/test_phase0_api_smoke.py", "-k", BACKEND_LAUNCH_TEST_SELECTOR],
                BACKEND,
                logs_dir,
                env,
            )
        )

    if not args.skip_static:
        steps.append(run_step("web typecheck", ["pnpm", "--dir", "web", "typecheck"], ROOT, logs_dir, env))
        steps.append(run_step("web lint", ["pnpm", "--dir", "web", "lint"], ROOT, logs_dir, env))

    if not args.skip_browser:
        steps.append(
            run_step(
                "playwright production suites a-i",
                ["pnpm", "--dir", "web", "exec", "playwright", "test", *PRODUCTION_SUITES, "--workers=1"],
                ROOT,
                logs_dir,
                env,
            )
        )

    posture = env_posture(args.mode, env)
    report: dict[str, object] = {
        "generated_at": now_utc(),
        "mode": args.mode,
        "tenant_code": args.tenant_code,
        "decision": decide_status(args.mode, steps, posture, preflight_only=args.preflight_only),
        "preflight_only": args.preflight_only,
        "steps": steps,
        "environment_posture": posture,
        "seed_manifest": seed_manifest,
        "production_exceptions": PRODUCTION_EXCEPTIONS,
        "json_report_path": display_path(artifact_dir / "launch-signoff-report.json"),
        "markdown_report_path": display_path(artifact_dir / "launch-signoff-report.md"),
        "logs_dir": display_path(logs_dir),
        "management_outputs_dir": display_path(management_outputs_dir),
    }
    json_report_path = artifact_dir / "launch-signoff-report.json"
    markdown_report_path = artifact_dir / "launch-signoff-report.md"
    json_report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    markdown_report_path.write_text(markdown_report(report), encoding="utf-8")

    log(f"[launch-signoff] decision: {report['decision']}")
    log(f"[launch-signoff] report: {display_path(markdown_report_path)}")

    if report["decision"] in {"LOCAL CONTRACT FAILED", "LAUNCH GATE FAILED"} and not args.allow_command_failures:
        return 1
    blocked_decisions = {
        "STAGING BLOCKED",
        "PRODUCTION BLOCKED",
        "STAGING PREFLIGHT BLOCKED",
        "PRODUCTION PREFLIGHT BLOCKED",
    }
    if report["decision"] in blocked_decisions and args.mode != "local" and not args.allow_command_failures:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
