#!/usr/bin/env python3
"""Run staging verification with sandbox/contract payroll dependencies."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shlex
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
WEB = ROOT / "web"
DEFAULT_PYTHON = BACKEND / ".venv" / "bin" / "python"

STAGE_CONTRACT_ENV = {
    "DJANGO_SETTINGS_MODULE": "config.settings.production",
    "DJANGO_SECRET_KEY": "stage-verification-only-change-me",
    "DJANGO_ALLOWED_HOSTS": "localhost,127.0.0.1,hrms.accerio.in",
    "DJANGO_CSRF_TRUSTED_ORIGINS": "https://hrms.accerio.in,http://localhost:3000,http://127.0.0.1:3000",
    "DJANGO_SESSION_COOKIE_SECURE": "true",
    "DJANGO_CSRF_COOKIE_SECURE": "true",
    "HRMS_ENVIRONMENT": "staging",
    "HRMS_ENABLE_DEMO_DATA": "false",
    "DJANGO_EMAIL_BACKEND": "django.core.mail.backends.smtp.EmailBackend",
    "DJANGO_EMAIL_HOST": "smtp.stage-verification.invalid",
    "DJANGO_DEFAULT_FROM_EMAIL": "stage-verification@hrms.local",
    "REDIS_URL": "redis://127.0.0.1:6379/0",
    "HRMS_NOTIFICATION_WORKER_ENABLED": "true",
    "HRMS_PAYROLL_PROVIDER_WORKER_ENABLED": "true",
    "HRMS_ENTERPRISE_IDENTITY_STATUS": "not_in_scope",
    "PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE": "strict",
}

STAGE_CONTRACT_JSON_ENV = {
    "HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON": {
        "stage:provider/contract/runtime": {
            "enabled": True,
            "source_ref": "stage-verification://sandbox-provider",
            "use_sandbox": True,
            "credentials": {},
            "metadata": {
                "environment": "staging",
                "contract_only": True,
            },
        },
    },
    "HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON": {
        "stage:storage/s3/contract-runtime": {
            "enabled": True,
            "provider_family": "s3",
            "source_ref": "stage-verification://object-storage-contract",
            "use_default_credentials": True,
            "credentials": {},
            "metadata": {
                "environment": "staging",
                "contract_only": True,
            },
        },
    },
    "HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON": {
        "stage:storage_policy/payroll/contract/v1": {
            "enabled": True,
            "allowed_provider_families": ["s3"],
            "allowed_provider_refs": ["payroll.storage.s3.private.v1"],
            "allowed_credential_refs": ["stage:storage/s3/contract-runtime"],
            "metadata": {
                "environment": "staging",
                "contract_only": True,
                "control_verification_mode": "strict",
            },
        },
    },
}


def now_utc() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slug_time() -> str:
    return dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")


def shell_join(command: list[str]) -> str:
    return " ".join(shlex.quote(part) for part in command)


def display_path(path: Path) -> str:
    return os.path.relpath(path, ROOT)


def run_step(name: str, command: list[str], cwd: Path, logs_dir: Path, env: dict[str, str]) -> dict[str, object]:
    started_at = now_utc()
    print(f"[stage-verification] {name}: {shell_join(command)}", flush=True)
    result = subprocess.run(command, cwd=cwd, env=env, text=True, capture_output=True, check=False)
    completed_at = now_utc()
    log_path = logs_dir / f"{name.lower().replace(' ', '-').replace('/', '-')}.log"
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
    print(f"[stage-verification] {name}: {status}", flush=True)
    return {
        "name": name,
        "status": status,
        "exit_code": result.returncode,
        "log_path": display_path(log_path),
        "started_at": started_at,
        "completed_at": completed_at,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact-dir", default="")
    parser.add_argument("--python", default=str(DEFAULT_PYTHON if DEFAULT_PYTHON.exists() else "python3"))
    parser.add_argument("--base-url", default=os.getenv("STAGE_BASE_URL", "https://hrms.accerio.in"))
    parser.add_argument("--skip-static", action="store_true")
    parser.add_argument("--skip-smoke", action="store_true")
    parser.add_argument("--ssh-target", default=os.getenv("STAGE_SSH_TARGET", ""))
    parser.add_argument("--ssh-key", default=os.getenv("STAGE_SSH_KEY", ""))
    parser.add_argument("--allow-failures", action="store_true")
    return parser.parse_args()


def stage_env() -> dict[str, str]:
    env = os.environ.copy()
    for key, value in STAGE_CONTRACT_ENV.items():
        env.setdefault(key, value)
    for key, value in STAGE_CONTRACT_JSON_ENV.items():
        env.setdefault(key, json.dumps(value, separators=(",", ":")))
    env.setdefault("HRMS_API_BASE_URL", f"{env.get('STAGE_BASE_URL', 'https://hrms.accerio.in').rstrip('/')}/api/v1")
    env.setdefault("PLAYWRIGHT_BASE_URL", env.get("STAGE_BASE_URL", "https://hrms.accerio.in"))
    return env


def ssh_command(args: argparse.Namespace, remote_command: str) -> list[str]:
    command = ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10"]
    if args.ssh_key:
        command.extend(["-i", str(Path(args.ssh_key).expanduser())])
    command.extend([args.ssh_target, remote_command])
    return command


def markdown_report(report: dict[str, object]) -> str:
    lines = [
        "# Stage Verification",
        "",
        f"- Generated: `{report['generated_at']}`",
        f"- Decision: `{report['decision']}`",
        f"- Base URL: `{report['base_url']}`",
        "",
        "## Steps",
        "",
        "| Step | Status | Exit | Log |",
        "|---|---|---:|---|",
    ]
    for step in report["steps"]:
        lines.append(f"| {step['name']} | `{step['status']}` | {step['exit_code']} | `{step['log_path']}` |")
    lines.extend(
        [
            "",
            "## Scope",
            "",
            "- Uses sandbox provider declarations and contract storage policy evidence.",
            "- Does not satisfy final production provider/storage credential evidence.",
            "- Demo data remains disabled.",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    artifact_dir = Path(args.artifact_dir) if args.artifact_dir else WEB / "qa-artifacts" / f"stage-verification-{slug_time()}"
    artifact_dir = artifact_dir.resolve()
    logs_dir = artifact_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    env = stage_env()
    env["STAGE_BASE_URL"] = args.base_url.rstrip("/")
    env["PLAYWRIGHT_BASE_URL"] = args.base_url.rstrip("/")
    env["HRMS_SMOKE_BASE_URL"] = args.base_url.rstrip("/")

    steps: list[dict[str, object]] = []
    steps.append(run_step("django check", [args.python, "manage.py", "check"], BACKEND, logs_dir, env))
    steps.append(run_step("django migrations dry run", [args.python, "manage.py", "makemigrations", "--check", "--dry-run"], BACKEND, logs_dir, env))
    steps.append(run_step("staging static preflight", [args.python, "manage.py", "production_preflight", "--strict", "--skip-network", "--json"], BACKEND, logs_dir, env))

    if not args.skip_static:
        steps.append(run_step("web typecheck", ["pnpm", "--dir", "web", "typecheck"], ROOT, logs_dir, env))
        steps.append(run_step("web lint", ["pnpm", "--dir", "web", "lint"], ROOT, logs_dir, env))

    if not args.skip_smoke:
        steps.append(run_step("deployed smoke", ["bash", "scripts/hrms-post-deploy-smoke.sh"], ROOT, logs_dir, env))

    if args.ssh_target:
        remote = (
            "set -e; "
            "systemctl is-active hrms-payroll-backend.service; "
            "systemctl is-active hrms-payroll-web.service; "
            "systemctl is-active postgresql.service; "
            "systemctl is-active redis-server.service; "
            "systemctl list-timers 'hrms-payroll-*' --no-pager"
        )
        steps.append(run_step("ec2 runtime services", ssh_command(args, remote), ROOT, logs_dir, env))

    failed = [step for step in steps if step["status"] != "passed"]
    report: dict[str, object] = {
        "generated_at": now_utc(),
        "decision": "PASS" if not failed else "FAIL",
        "base_url": args.base_url.rstrip("/"),
        "steps": steps,
        "json_report_path": display_path(artifact_dir / "stage-verification.json"),
        "markdown_report_path": display_path(artifact_dir / "stage-verification.md"),
    }
    (artifact_dir / "stage-verification.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (artifact_dir / "stage-verification.md").write_text(markdown_report(report), encoding="utf-8")
    print(f"[stage-verification] decision: {report['decision']}", flush=True)
    print(f"[stage-verification] report: {report['markdown_report_path']}", flush=True)
    return 0 if report["decision"] == "PASS" or args.allow_failures else 1


if __name__ == "__main__":
    sys.exit(main())
