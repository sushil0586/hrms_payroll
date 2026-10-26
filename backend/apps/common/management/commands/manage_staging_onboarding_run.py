"""Collect exact-ID evidence or plan/execute governed onboarding cleanup."""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.common.staging_onboarding import (
    collect_onboarding_evidence,
    execute_onboarding_cleanup,
    load_run_manifest,
    plan_onboarding_cleanup,
)


class Command(BaseCommand):
    help = "Reads a Batch-1 ownership manifest for evidence or governed exact-ID cleanup."

    def add_arguments(self, parser):
        parser.add_argument("action", choices=["evidence", "cleanup"])
        parser.add_argument("--manifest", required=True)
        parser.add_argument("--run-id", required=True)
        parser.add_argument("--environment-fingerprint", required=True)
        parser.add_argument("--output-file", default="")
        parser.add_argument("--execute", action="store_true")
        parser.add_argument("--actor-username", default="")
        parser.add_argument("--authorization-ref", default="")
        parser.add_argument("--recovery-ref", default="")

    def handle(self, *args, **options):
        manifest = load_run_manifest(
            Path(options["manifest"]),
            expected_run_id=options["run_id"],
            expected_fingerprint=options["environment_fingerprint"],
        )
        if options["action"] == "evidence":
            if options["execute"]:
                raise CommandError("--execute is valid only for cleanup.")
            result = collect_onboarding_evidence(manifest)
        elif options["execute"]:
            result = execute_onboarding_cleanup(
                manifest,
                actor_username=options["actor_username"],
                authorization_ref=options["authorization_ref"],
                recovery_ref=options["recovery_ref"],
            )
        else:
            result = plan_onboarding_cleanup(manifest)
        payload = json.dumps(result, indent=2, sort_keys=True)
        if options["output_file"]:
            target = Path(options["output_file"])
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(payload + "\n", encoding="utf-8")
        self.stdout.write(payload)
