"""Durable orchestration for long-running payroll lifecycle operations."""

from __future__ import annotations

import hashlib
import json
from datetime import timedelta
from typing import Any

from django.db import OperationalError, transaction
from django.db.models import Q
from django.utils import timezone
from billiard.exceptions import SoftTimeLimitExceeded

from apps.payroll.models import (
    PayrollBackgroundJob,
    PayrollBackgroundJobOperation,
    PayrollBackgroundJobStatus,
    PayrollCalculationLine,
    PayrollFinanceHandoff,
    PayrollOutputArtifact,
    PayrollOutputArtifactKind,
    PayrollRunCalculation,
)
from apps.payroll.services import (
    calculate_draft_payroll_run,
    generate_payroll_finance_handoff,
    generate_payroll_outputs,
    publish_payroll_output_batch,
)


class RetryablePayrollBackgroundJobError(RuntimeError):
    """Signals a bounded Celery retry after durable job state has been updated."""


def payroll_background_job_payload(job: PayrollBackgroundJob) -> dict[str, Any]:
    return {
        "id": job.id,
        "operation": job.operation,
        "operation_label": job.get_operation_display(),
        "status": job.status,
        "status_label": job.get_status_display(),
        "stage": job.stage,
        "total_items": job.total_items,
        "completed_items": job.completed_items,
        "attempt_count": job.attempt_count,
        "max_attempts": job.max_attempts,
        "retryable": job.retryable,
        "payroll_run_id": job.payroll_run_id,
        "review_id": job.review_id,
        "output_batch_id": job.output_batch_id,
        "requested_by_name": str(job.requested_by) if job.requested_by else None,
        "queued_at": job.queued_at,
        "started_at": job.started_at,
        "heartbeat_at": job.heartbeat_at,
        "completed_at": job.completed_at,
        "next_retry_at": job.next_retry_at,
        "error": {
            "code": job.error_code,
            "message": job.error_message,
        } if job.error_code or job.error_message else None,
        "result": job.result_snapshot,
        "status_url": f"/api/hr-admin/payroll-jobs/{job.id}",
        "retry_url": f"/api/hr-admin/payroll-jobs/{job.id}/retry",
    }


def _job_key(*, operation: str, target_id, request_snapshot: dict[str, Any], client_key: str = "") -> str:
    if client_key:
        material = f"client:{operation}:{target_id}:{client_key.strip()}"
    else:
        material = json.dumps(
            {"operation": operation, "target_id": str(target_id), "request": request_snapshot},
            sort_keys=True,
            default=str,
        )
    return f"payroll-background:{hashlib.sha256(material.encode('utf-8')).hexdigest()}"


def enqueue_payroll_background_job(
    *,
    tenant,
    operation: str,
    target,
    requested_by,
    request_snapshot: dict[str, Any] | None = None,
    client_key: str = "",
) -> tuple[PayrollBackgroundJob, bool]:
    request_snapshot = request_snapshot or {}
    if operation == PayrollBackgroundJobOperation.CALCULATE:
        target_fields = {"payroll_run": target}
    elif operation == PayrollBackgroundJobOperation.GENERATE_OUTPUTS:
        target_fields = {"review": target, "payroll_run": target.payroll_run}
    elif operation in {
        PayrollBackgroundJobOperation.PUBLISH_OUTPUTS,
        PayrollBackgroundJobOperation.GENERATE_FINANCE_HANDOFF,
    }:
        target_fields = {"output_batch": target, "review": target.review, "payroll_run": target.payroll_run}
    else:
        raise ValueError("Unsupported payroll background operation.")
    idempotency_key = _job_key(
        operation=operation,
        target_id=target.id,
        request_snapshot=request_snapshot,
        client_key=client_key,
    )
    with transaction.atomic():
        job, created = PayrollBackgroundJob.objects.get_or_create(
            tenant=tenant,
            idempotency_key=idempotency_key,
            defaults={
                "operation": operation,
                "requested_by": requested_by,
                "request_snapshot": request_snapshot,
                **target_fields,
            },
        )
    return job, created


def dispatch_payroll_background_job(job: PayrollBackgroundJob) -> bool:
    if job.status != PayrollBackgroundJobStatus.QUEUED or job.celery_task_id:
        return False
    from apps.payroll.tasks import execute_payroll_background_job_task

    try:
        result = execute_payroll_background_job_task.apply_async(args=[str(job.id)], retry=False)
    except Exception as exc:
        PayrollBackgroundJob.objects.filter(id=job.id, status=PayrollBackgroundJobStatus.QUEUED).update(
            error_code="broker_dispatch_failed",
            error_message=str(exc),
            retryable=True,
            next_retry_at=timezone.now() + timedelta(seconds=30),
        )
        job.refresh_from_db()
        return False
    PayrollBackgroundJob.objects.filter(id=job.id, status=PayrollBackgroundJobStatus.QUEUED).update(
        celery_task_id=result.id,
        error_code="",
        error_message="",
        next_retry_at=None,
    )
    job.refresh_from_db()
    return True


def dispatch_pending_payroll_background_jobs(*, limit: int = 100) -> int:
    recover_stale_payroll_background_jobs(limit=limit)
    now = timezone.now()
    jobs = PayrollBackgroundJob.objects.filter(
        status=PayrollBackgroundJobStatus.QUEUED,
        celery_task_id="",
    ).filter(Q(next_retry_at__isnull=True) | Q(next_retry_at__lte=now))
    dispatched = 0
    for job in jobs.order_by("queued_at")[: max(1, limit)]:
        dispatched += int(dispatch_payroll_background_job(job))
    return dispatched


def recover_stale_payroll_background_jobs(*, limit: int = 100) -> int:
    cutoff = timezone.now() - timedelta(minutes=7)
    recovered = 0
    for job in PayrollBackgroundJob.objects.filter(
        status=PayrollBackgroundJobStatus.RUNNING,
        heartbeat_at__lt=cutoff,
    ).order_by("heartbeat_at")[: max(1, limit)]:
        exhausted = job.attempt_count >= job.max_attempts
        PayrollBackgroundJob.objects.filter(id=job.id, status=PayrollBackgroundJobStatus.RUNNING).update(
            status=PayrollBackgroundJobStatus.FAILED if exhausted else PayrollBackgroundJobStatus.QUEUED,
            stage="failed" if exhausted else "queued",
            celery_task_id="",
            completed_at=timezone.now() if exhausted else None,
            retryable=True,
            next_retry_at=None,
            error_code="worker_heartbeat_stale",
            error_message="Payroll worker stopped reporting before the operation completed.",
        )
        recovered += 1
    return recovered


def _job_total(job: PayrollBackgroundJob) -> int:
    if job.operation == PayrollBackgroundJobOperation.CALCULATE:
        return job.payroll_run.input_snapshots.count()
    if job.operation == PayrollBackgroundJobOperation.GENERATE_OUTPUTS:
        return job.review.calculation.lines.values("employee_id").distinct().count()
    if job.operation == PayrollBackgroundJobOperation.PUBLISH_OUTPUTS:
        return job.output_batch.artifacts.count()
    if job.operation == PayrollBackgroundJobOperation.GENERATE_FINANCE_HANDOFF:
        return 3
    return 0


def _execute_operation(job: PayrollBackgroundJob) -> dict[str, Any]:
    request = job.request_snapshot if isinstance(job.request_snapshot, dict) else {}
    if job.operation == PayrollBackgroundJobOperation.CALCULATE:
        calculation = calculate_draft_payroll_run(
            job.payroll_run,
            calculated_by=job.requested_by,
            calculation_profile_ref=request.get("calculation_profile_ref") or None,
        )
        return {
            "calculation_id": str(calculation.id),
            "status": calculation.status,
            "line_count": PayrollCalculationLine.objects.filter(calculation=calculation).count(),
            "totals": calculation.totals_snapshot,
        }
    if job.operation == PayrollBackgroundJobOperation.GENERATE_OUTPUTS:
        batch = generate_payroll_outputs(
            job.review,
            generated_by=job.requested_by,
            output_profile_ref=request.get("output_profile_ref") or None,
        )
        return {
            "output_batch_id": str(batch.id),
            "status": batch.status,
            "artifact_count": batch.artifacts.count(),
        }
    if job.operation == PayrollBackgroundJobOperation.PUBLISH_OUTPUTS:
        batch = publish_payroll_output_batch(job.output_batch, published_by=job.requested_by)
        return {
            "output_batch_id": str(batch.id),
            "status": batch.status,
            "artifact_count": batch.artifacts.count(),
        }
    if job.operation == PayrollBackgroundJobOperation.GENERATE_FINANCE_HANDOFF:
        handoff = generate_payroll_finance_handoff(
            job.output_batch,
            generated_by=job.requested_by,
            handoff_profile_ref=request.get("handoff_profile_ref") or None,
        )
        return {
            "finance_handoff_id": str(handoff.id),
            "status": handoff.status,
            "artifact_count": PayrollOutputArtifact.objects.filter(
                output_batch=job.output_batch,
                kind__in=[
                    PayrollOutputArtifactKind.BANK_ADVICE,
                    PayrollOutputArtifactKind.ACCOUNTING_EXPORT,
                    PayrollOutputArtifactKind.STATUTORY_REPORT,
                ],
            ).count(),
        }
    raise ValueError("Unsupported payroll background operation.")


def execute_payroll_background_job(job_id, *, task_id: str = "") -> PayrollBackgroundJob:
    now = timezone.now()
    with transaction.atomic():
        job = PayrollBackgroundJob.objects.select_for_update().get(id=job_id)
        if job.status == PayrollBackgroundJobStatus.SUCCEEDED:
            return job
        if (
            job.status == PayrollBackgroundJobStatus.RUNNING
            and job.heartbeat_at
            and job.heartbeat_at > now - timedelta(minutes=7)
            and job.celery_task_id != task_id
        ):
            return job
        job.status = PayrollBackgroundJobStatus.RUNNING
        job.stage = f"{job.operation}:processing"
        job.started_at = job.started_at or now
        job.heartbeat_at = now
        job.completed_at = None
        job.attempt_count += 1
        job.celery_task_id = task_id or job.celery_task_id
        job.total_items = _job_total(job)
        job.completed_items = 0
        job.retryable = False
        job.error_code = ""
        job.error_message = ""
        job.next_retry_at = None
        job.save()

    try:
        with transaction.atomic():
            result = _execute_operation(job)
            PayrollBackgroundJob.objects.filter(id=job.id).update(
                status=PayrollBackgroundJobStatus.SUCCEEDED,
                stage="completed",
                completed_items=job.total_items,
                heartbeat_at=timezone.now(),
                completed_at=timezone.now(),
                retryable=False,
                next_retry_at=None,
                error_code="",
                error_message="",
                result_snapshot=result,
            )
    except Exception as exc:
        retryable = isinstance(exc, (OperationalError, ConnectionError, TimeoutError, SoftTimeLimitExceeded)) or bool(getattr(exc, "retryable", False))
        exhausted = job.attempt_count >= job.max_attempts
        next_retry_at = now + timedelta(seconds=min(60, 5 * (2 ** max(0, job.attempt_count - 1)))) if retryable and not exhausted else None
        PayrollBackgroundJob.objects.filter(id=job.id).update(
            status=PayrollBackgroundJobStatus.QUEUED if next_retry_at else PayrollBackgroundJobStatus.FAILED,
            stage="retry_scheduled" if next_retry_at else "failed",
            heartbeat_at=timezone.now(),
            completed_at=None if next_retry_at else timezone.now(),
            celery_task_id=job.celery_task_id,
            retryable=retryable,
            next_retry_at=next_retry_at,
            error_code="transient_execution_error" if retryable else "payroll_operation_failed",
            error_message=str(exc),
        )
        job.refresh_from_db()
        if next_retry_at:
            raise RetryablePayrollBackgroundJobError(str(exc)) from exc
        return job

    job.refresh_from_db()
    return job


def retry_payroll_background_job(job: PayrollBackgroundJob) -> PayrollBackgroundJob:
    if job.status != PayrollBackgroundJobStatus.FAILED or not job.retryable:
        raise ValueError("Only retryable failed payroll jobs can be retried.")
    PayrollBackgroundJob.objects.filter(id=job.id).update(
        status=PayrollBackgroundJobStatus.QUEUED,
        stage="queued",
        celery_task_id="",
        completed_at=None,
        next_retry_at=None,
        error_code="",
        error_message="",
    )
    job.refresh_from_db()
    return job
