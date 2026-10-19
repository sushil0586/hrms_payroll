"""Loopback-only ESS2 QA server with a queue sized for concurrent SSR reads."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def serve():
    from django.conf import settings
    from django.core.management import execute_from_command_line
    from django.core.servers.basehttp import WSGIServer

    database = settings.DATABASES["default"]
    if database["NAME"] != "hrms_ess2" or database["HOST"] != "127.0.0.1":
        raise RuntimeError("ESS2 QA server requires the dedicated loopback database")
    # Application read timeouts remain unchanged. The dev server's default 10
    # pending TCP connections is too small for overlapping App Router SSR reads.
    WSGIServer.request_queue_size = 128
    execute_from_command_line(["manage.py", "runserver", "127.0.0.1:8048", "--noreload"])


if __name__ == "__main__":
    serve()
