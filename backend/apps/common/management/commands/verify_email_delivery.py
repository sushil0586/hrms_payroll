"""Send a live email delivery proof through the configured Django mail backend."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


UNSAFE_EMAIL_BACKENDS = {
    "django.core.mail.backends.console.EmailBackend",
    "django.core.mail.backends.locmem.EmailBackend",
    "django.core.mail.backends.dummy.EmailBackend",
    "django.core.mail.backends.filebased.EmailBackend",
}


class Command(BaseCommand):
    help = "Sends a production email proof and writes sanitized delivery evidence."

    def add_arguments(self, parser):
        parser.add_argument("--to", default=os.getenv("HRMS_EMAIL_DELIVERY_PROOF_TO", ""), help="Verified recipient address.")
        parser.add_argument("--subject", default="HRMS production email delivery proof")
        parser.add_argument("--output-file", default=os.getenv("HRMS_EMAIL_DELIVERY_EVIDENCE_FILE", ""))

    def handle(self, *args, **options):
        recipient = (options["to"] or "").strip()
        if not recipient:
            raise CommandError("A recipient is required through --to or HRMS_EMAIL_DELIVERY_PROOF_TO.")

        backend = str(getattr(settings, "EMAIL_BACKEND", ""))
        if backend in UNSAFE_EMAIL_BACKENDS:
            raise CommandError(f"Unsafe email backend {backend} cannot be used for production delivery proof.")

        sent_at = timezone.now()
        body = "\n".join(
            [
                "This is an HRMS production email delivery proof.",
                f"Sent at: {sent_at.isoformat()}",
                f"Environment: {getattr(settings, 'HRMS_ENVIRONMENT', '')}",
            ]
        )
        message = EmailMessage(
            subject=options["subject"],
            body=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", ""),
            to=[recipient],
            headers={"X-HRMS-Delivery-Proof": sent_at.strftime("%Y%m%dT%H%M%SZ")},
        )
        connection = get_connection(timeout=20)
        delivered_count = connection.send_messages([message])
        payload = {
            "status": "passed" if delivered_count == 1 else "failed",
            "sent_at": sent_at.isoformat(),
            "backend": backend,
            "from_email": getattr(settings, "DEFAULT_FROM_EMAIL", ""),
            "recipient_sha256": hashlib.sha256(recipient.lower().encode("utf-8")).hexdigest(),
            "delivered_count": delivered_count,
            "subject_sha256": hashlib.sha256(options["subject"].encode("utf-8")).hexdigest(),
        }
        payload["evidence_checksum_sha256"] = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()

        output_file = (options["output_file"] or "").strip()
        if output_file:
            path = Path(output_file)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")

        self.stdout.write(json.dumps(payload, indent=2, sort_keys=True))
        if delivered_count != 1:
            raise CommandError("Email delivery proof failed.")
