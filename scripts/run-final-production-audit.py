#!/usr/bin/env python3
"""Run the final production audit and emit PASS/FAIL evidence.

This runner intentionally fails unless real deployment credentials and provider
evidence are supplied. It is the executable version of the P0/P1 launch gates.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
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

REQUIRED_ENV = [
    "PLAYWRIGHT_BASE_URL",
    "HRMS_API_BASE_URL",
    "PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME",
    "PLAYWRIGHT_LIVE_HR_ADMIN_PASSWORD",
    "PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME",
    "PLAYWRIGHT_LIVE_EMPLOYEE_PASSWORD",
    "PLAYWRIGHT_LIVE_MANAGER_USERNAME",
    "PLAYWRIGHT_LIVE_MANAGER_PASSWORD",
    "PLAYWRIGHT_LIVE_TENANT_ADMIN_USERNAME",
    "PLAYWRIGHT_LIVE_TENANT_ADMIN_PASSWORD",
    "PLAYWRIGHT_LIVE_PLATFORM_ADMIN_USERNAME",
    "PLAYWRIGHT_LIVE_PLATFORM_ADMIN_PASSWORD",
    "PLAYWRIGHT_LIVE_PAYROLL_FINANCE_USERNAME",
    "PLAYWRIGHT_LIVE_PAYROLL_FINANCE_PASSWORD",
    "PLAYWRIGHT_LIVE_SUPPORT_AGENT_USERNAME",
    "PLAYWRIGHT_LIVE_SUPPORT_AGENT_PASSWORD",
    "HRMS_EMAIL_DELIVERY_PROOF_TO",
    "HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON",
    "HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON",
    "HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON",
    "HRMS_NOTIFICATION_PROCESSOR_ENABLED",
    "HRMS_PAYROLL_PROVIDER_WORKER_ENABLED",
    "HRMS_ENTERPRISE_IDENTITY_STATUS",
]

PLAYWRIGHT_SUITES = [
    "tests/e2e/deployed-readonly-auth-routing.spec.ts",
    "tests/e2e/public-launch-role-menu-certification.spec.ts",
    "tests/e2e/production-tenant-role-isolation.spec.ts",
    "tests/e2e/production-notification-flows.spec.ts",
    "tests/e2e/production-payroll-close-flows.spec.ts",
    "tests/e2e/production-payroll-negative-controls.spec.ts",
    "tests/e2e/production-provider-callback-flows.spec.ts",
    "tests/e2e/production-storage-governance-flows.spec.ts",
    "tests/e2e/accerio-september-payroll-real-scenario.spec.ts",
    "tests/e2e/hr-admin-payroll-cycle-phase11-certification.spec.ts",
    "tests/e2e/pilot-100-finance-handoff-compliance-certification.spec.ts",
]


def now_utc() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slug_time() -> str:
    return dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")


def shell_join(command: list[str]) -> str:
    return " ".join(shlex.quote(item) for item in command)


def run_step(name: str, command: list[str], cwd: Path, logs_dir: Path, env: dict[str, str]) -> dict[str, object]:
    started_at = now_utc()
    print(f"[final-audit] {name}: {shell_join(command)}", flush=True)
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
    return {
        "name": name,
        "status": "passed" if result.returncode == 0 else "failed",
        "exit_code": result.returncode,
        "log_path": str(log_path.relative_to(ROOT)),
        "started_at": started_at,
        "completed_at": completed_at,
    }


def env_gate(env: dict[str, str]) -> list[dict[str, object]]:
    gates = []
    for key in REQUIRED_ENV:
        configured = bool(env.get(key, "").strip())
        gates.append({
            "name": f"env:{key}",
            "status": "passed" if configured else "failed",
            "exit_code": 0 if configured else 1,
            "log_path": "",
        })
    return gates


def write_report(report: dict[str, object], report_path: Path) -> None:
    lines = [
        "# Final Production Audit",
        "",
        f"- Generated: `{report['generated_at']}`",
        f"- Decision: `{report['decision']}`",
        f"- Base URL: `{report['base_url']}`",
        "",
        "## Gates",
        "",
        "| Gate | Status | Evidence |",
        "| --- | --- | --- |",
    ]
    for gate in report["gates"]:
        lines.append(f"| {gate['name']} | `{gate['status']}` | `{gate.get('log_path', '')}` |")
    lines.extend(
        [
            "",
            "## Required External Evidence",
            "",
            "- Deployed role login/RBAC screenshots and Playwright report.",
            "- Email provider accepted delivery proof JSON.",
            "- Payroll finance handoff/audit-pack Playwright report.",
            "- Provider callback/storage governance Playwright reports.",
            "- Backup restore rehearsal log/checksum and alert delivery proof.",
            "",
            f"- JSON report: `{report['json_report_path']}`",
            f"- Evidence checksum: `{report['evidence_checksum_sha256']}`",
        ]
    )
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact-dir", default="")
    parser.add_argument("--python", default=str(DEFAULT_PYTHON if DEFAULT_PYTHON.exists() else "python3"))
    parser.add_argument("--skip-browser", action="store_true")
    parser.add_argument("--allow-failures", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    artifact_dir = Path(args.artifact_dir) if args.artifact_dir else WEB / "qa-artifacts" / f"final-production-audit-{slug_time()}"
    artifact_dir = artifact_dir.resolve()
    logs_dir = artifact_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env.setdefault("HRMS_ENABLE_DEMO_DATA", "false")
    env.setdefault("HRMS_EMAIL_DELIVERY_EVIDENCE_FILE", str(artifact_dir / "email-delivery-proof.json"))

    gates: list[dict[str, object]] = env_gate(env)
    if all(gate["status"] == "passed" for gate in gates):
        gates.append(run_step("production preflight", [args.python, "manage.py", "production_preflight", "--strict", "--json"], BACKEND, logs_dir, env))
        gates.append(run_step("email delivery proof", [args.python, "manage.py", "verify_email_delivery"], BACKEND, logs_dir, env))
        gates.append(run_step("post deploy smoke", ["bash", "scripts/hrms-post-deploy-smoke.sh"], ROOT, logs_dir, env))
        if not args.skip_browser:
            gates.append(
                run_step(
                    "playwright deployed p0 p1 suites",
                    ["pnpm", "--dir", "web", "exec", "playwright", "test", *PLAYWRIGHT_SUITES, "--project=chromium", "--workers=1"],
                    ROOT,
                    logs_dir,
                    env,
                )
            )

    failed = [gate for gate in gates if gate["status"] != "passed"]
    report: dict[str, object] = {
        "generated_at": now_utc(),
        "decision": "PASS" if not failed else "FAIL",
        "base_url": env.get("PLAYWRIGHT_BASE_URL", ""),
        "gates": gates,
        "json_report_path": str((artifact_dir / "final-production-audit.json").relative_to(ROOT)),
        "markdown_report_path": str((artifact_dir / "final-production-audit.md").relative_to(ROOT)),
    }
    checksum_payload = json.dumps(report, sort_keys=True).encode("utf-8")
    report["evidence_checksum_sha256"] = hashlib.sha256(checksum_payload).hexdigest()
    json_path = artifact_dir / "final-production-audit.json"
    md_path = artifact_dir / "final-production-audit.md"
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    write_report(report, md_path)
    print(f"[final-audit] decision: {report['decision']}")
    print(f"[final-audit] report: {md_path.relative_to(ROOT)}")
    return 0 if report["decision"] == "PASS" or args.allow_failures else 1


if __name__ == "__main__":
    sys.exit(main())
