#!/usr/bin/env python3
"""Run the public-launch readiness gate and write a compact evidence report."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shlex
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
WEB = ROOT / "web"
BACKEND_VENV_PYTHON = BACKEND / ".venv" / "bin" / "python"
ROOT_VENV_PYTHON = ROOT / ".venv" / "bin" / "python"
CRITICAL_BROWSER_SUITES = [
    "tests/e2e/production-launch-release-gate.spec.ts",
    "tests/e2e/pilot-credential-matrix-certification.spec.ts",
    "tests/e2e/payroll-outputs-flows.spec.ts",
    "tests/e2e/payroll-statutory-flows.spec.ts",
    "tests/e2e/payroll-providers-flows.spec.ts",
    "tests/e2e/tds-efile-package-certification.spec.ts",
]


def parse_args() -> argparse.Namespace:
    default_python = BACKEND_VENV_PYTHON if BACKEND_VENV_PYTHON.exists() else ROOT_VENV_PYTHON if ROOT_VENV_PYTHON.exists() else Path("python3")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["local", "staging", "production"], default="staging")
    parser.add_argument("--artifact-dir", default="")
    parser.add_argument("--python", default=str(default_python))
    parser.add_argument("--base-url", default=os.environ.get("PLAYWRIGHT_BASE_URL", "https://hrms.accerio.in"))
    parser.add_argument("--api-base-url", default=os.environ.get("HRMS_API_BASE_URL", "https://hrms.accerio.in/api/v1"))
    parser.add_argument("--seed-password", default=os.environ.get("PLAYWRIGHT_LIVE_SEED_PASSWORD", "Password@123"))
    parser.add_argument("--skip-browser", action="store_true")
    parser.add_argument("--skip-web-build", action="store_true")
    parser.add_argument("--allow-command-failures", action="store_true")
    return parser.parse_args()


def now_utc() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slug_time() -> str:
    return dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")


def shell_join(command: list[str]) -> str:
    return " ".join(shlex.quote(part) for part in command)


def run_step(name: str, command: list[str], cwd: Path, logs_dir: Path, env: dict[str, str]) -> dict[str, object]:
    started_at = now_utc()
    print(f"[public-launch-gate] {name}: {shell_join(command)}", flush=True)
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
    print(f"[public-launch-gate] {name}: {status}", flush=True)
    return {
        "name": name,
        "command": command,
        "cwd": str(cwd),
        "status": status,
        "exit_code": result.returncode,
        "started_at": started_at,
        "completed_at": completed_at,
        "log_path": str(log_path.relative_to(ROOT)),
    }


def write_report(report: dict[str, object], report_path: Path) -> None:
    steps = report["steps"]
    passed = sum(1 for step in steps if step["status"] == "passed")
    failed = sum(1 for step in steps if step["status"] != "passed")
    lines = [
        "# Public Launch Gate Report",
        "",
        f"- Mode: `{report['mode']}`",
        f"- Started at: `{report['started_at']}`",
        f"- Completed at: `{report['completed_at']}`",
        f"- Decision: `{report['decision']}`",
        f"- Passed steps: `{passed}`",
        f"- Failed steps: `{failed}`",
        "",
        "## Gate Steps",
        "",
        "| Step | Status | Evidence |",
        "| --- | --- | --- |",
    ]
    for step in steps:
        lines.append(f"| {step['name']} | {step['status']} | `{step['log_path']}` |")
    lines.extend(
        [
            "",
            "## Launch Gates Covered",
            "",
            "- Backend system check and migration safety.",
            "- API health and post-deploy readiness smoke.",
            "- Backend unauthenticated health endpoint regression.",
            "- Web type/build safety.",
            "- Critical browser certification pack when browser is enabled.",
            "",
            "## Remaining Manual Gates",
            "",
            "- Real provider contracts, sandbox credentials, and production credentials.",
            "- Production AWS monitoring/alert delivery proof.",
            "- Backup restore evidence in the target production environment.",
            "- Legal/commercial approval and stakeholder signoff.",
            "",
            f"- JSON report: `{report['json_report_path']}`",
            f"- Markdown report: `{report['markdown_report_path']}`",
            f"- Logs: `{report['logs_dir']}`",
        ]
    )
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    artifact_dir = Path(args.artifact_dir) if args.artifact_dir else WEB / "qa-artifacts" / f"public-launch-gate-{slug_time()}"
    artifact_dir = artifact_dir.resolve()
    logs_dir = artifact_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env.setdefault("PLAYWRIGHT_BASE_URL", args.base_url)
    env.setdefault("HRMS_API_BASE_URL", args.api_base_url)
    env.setdefault("HRMS_ENABLE_DEMO_DATA", "false")
    env.setdefault("PLAYWRIGHT_LIVE_SEED_PASSWORD", args.seed_password)
    if args.mode == "local":
        env.setdefault("HRMS_SMOKE_CHECK_SYSTEMD", "false")
        env.setdefault("HRMS_SMOKE_DISK_WARN_PERCENT", "100")

    steps: list[dict[str, object]] = []
    started_at = now_utc()
    steps.append(run_step("django check", [args.python, "manage.py", "check"], BACKEND, logs_dir, env))
    steps.append(run_step("django migrations dry run", [args.python, "manage.py", "makemigrations", "--check", "--dry-run"], BACKEND, logs_dir, env))
    health_route_check = (
        "from django.test import Client; "
        "response = Client().get('/api/v1/health/', HTTP_HOST='localhost'); "
        "assert response.status_code == 200, response.status_code; "
        "assert response.json() == {'status': 'ok', 'service': 'hrms-backend'}, response.content; "
        "print(response.json())"
    )
    steps.append(
        run_step(
            "backend api health route check",
            [args.python, "manage.py", "shell", "-c", health_route_check],
            BACKEND,
            logs_dir,
            env,
        )
    )
    steps.append(run_step("post deploy smoke", ["bash", "scripts/hrms-post-deploy-smoke.sh"], ROOT, logs_dir, env))
    steps.append(run_step("web typecheck", ["pnpm", "--dir", "web", "exec", "tsc", "--noEmit"], ROOT, logs_dir, env))
    if not args.skip_web_build:
        steps.append(run_step("web production build", ["pnpm", "--dir", "web", "build"], ROOT, logs_dir, env))
    if not args.skip_browser:
        steps.append(
            run_step(
                "critical browser certification",
                [
                    "pnpm",
                    "--dir",
                    "web",
                    "exec",
                    "playwright",
                    "test",
                    *CRITICAL_BROWSER_SUITES,
                    "--project=chromium",
                    "--workers=1",
                    "--reporter=line",
                    "--timeout=720000",
                ],
                ROOT,
                logs_dir,
                env,
            )
        )

    completed_at = now_utc()
    failed = [step for step in steps if step["status"] != "passed"]
    decision = "passed" if not failed else "failed"
    report = {
        "mode": args.mode,
        "decision": decision,
        "started_at": started_at,
        "completed_at": completed_at,
        "steps": steps,
        "logs_dir": str(logs_dir.relative_to(ROOT)),
        "json_report_path": "",
        "markdown_report_path": "",
    }
    json_report_path = artifact_dir / "public-launch-gate-report.json"
    markdown_report_path = artifact_dir / "public-launch-gate-report.md"
    report["json_report_path"] = str(json_report_path.relative_to(ROOT))
    report["markdown_report_path"] = str(markdown_report_path.relative_to(ROOT))
    json_report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    write_report(report, markdown_report_path)

    print(f"[public-launch-gate] report: {markdown_report_path.relative_to(ROOT)}", flush=True)
    if failed and not args.allow_command_failures:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
