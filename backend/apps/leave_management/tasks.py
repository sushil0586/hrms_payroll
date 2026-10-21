"""Celery dispatch and execution for durable leave-year close runs."""

from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.leave_management.models import LeaveYearCloseRun, LeaveYearCloseRunStatus
from apps.leave_management.year_end_services import execute_leave_year_close_run


@shared_task(name="leave.process_due_auto_approvals", acks_late=True, reject_on_worker_lost=True)
def process_due_leave_auto_approvals_task(limit: int = 100) -> dict:
    from apps.leave_management.auto_approval import process_due_leave_auto_approvals

    result = process_due_leave_auto_approvals(limit=limit)
    if result["failed"]:
        raise RuntimeError(f"{result['failed']} automatic leave approval candidates failed; see worker logs.")
    return result


@shared_task(
    bind=True,
    name="leave.execute_year_close",
    acks_late=True,
    reject_on_worker_lost=True,
    max_retries=2,
    soft_time_limit=900,
    time_limit=930,
)
def execute_leave_year_close_task(self, run_id: str) -> dict:
    run = LeaveYearCloseRun.objects.get(pk=run_id)
    try:
        run = execute_leave_year_close_run(run)
    except Exception as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=min(120, 10 * (2 ** self.request.retries)))
        raise
    return {"run_id": str(run.id), "status": run.status, "processed_count": run.processed_count, "failed_count": run.failed_count}


def dispatch_pending_leave_year_close_runs(*, limit: int = 50) -> int:
    dispatched = 0
    now = timezone.now()
    candidate_ids = list(
        LeaveYearCloseRun.objects.filter(
            status=LeaveYearCloseRunStatus.QUEUED,
            dispatched_at__isnull=True,
        ).filter(scheduled_for__isnull=True).values_list("id", flat=True)[:limit]
    )
    remaining = max(0, limit - len(candidate_ids))
    if remaining:
        candidate_ids.extend(
            LeaveYearCloseRun.objects.filter(
                status=LeaveYearCloseRunStatus.QUEUED,
                dispatched_at__isnull=True,
                scheduled_for__lte=now,
            ).values_list("id", flat=True)[:remaining]
        )
    for run_id in dict.fromkeys(candidate_ids):
        with transaction.atomic():
            run = LeaveYearCloseRun.objects.select_for_update().get(pk=run_id)
            if run.status != LeaveYearCloseRunStatus.QUEUED or run.dispatched_at is not None:
                continue
            result = execute_leave_year_close_task.apply_async(args=[str(run.id)])
            run.dispatched_at = now
            run.celery_task_id = result.id or ""
            run.save(update_fields=["dispatched_at", "celery_task_id", "updated_at"])
            dispatched += 1
    return dispatched


def recover_stale_leave_year_close_runs() -> int:
    cutoff = timezone.now() - timedelta(seconds=settings.LEAVE_YEAR_CLOSE_STALE_SECONDS)
    with transaction.atomic():
        stale = LeaveYearCloseRun.objects.select_for_update().filter(
            status=LeaveYearCloseRunStatus.RUNNING,
            started_at__lt=cutoff,
            completed_at__isnull=True,
        )
        count = stale.count()
        stale.update(
            status=LeaveYearCloseRunStatus.QUEUED,
            dispatched_at=None,
            celery_task_id="",
            error_snapshot={"category": "worker_stale", "message": "Recovered after worker heartbeat timeout."},
        )
    return count


@shared_task(name="leave.dispatch_pending_year_close_runs")
def dispatch_pending_leave_year_close_runs_task(limit: int = 50) -> dict:
    return {
        "recovered": recover_stale_leave_year_close_runs(),
        "dispatched": dispatch_pending_leave_year_close_runs(limit=limit),
    }
