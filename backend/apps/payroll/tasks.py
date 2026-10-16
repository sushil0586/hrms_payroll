"""Celery tasks for durable payroll lifecycle operations."""

from celery import shared_task

from apps.payroll.background_jobs import (
    RetryablePayrollBackgroundJobError,
    dispatch_pending_payroll_background_jobs,
    execute_payroll_background_job,
)


@shared_task(
    bind=True,
    name="payroll.execute_background_job",
    acks_late=True,
    reject_on_worker_lost=True,
    max_retries=2,
    soft_time_limit=300,
    time_limit=330,
)
def execute_payroll_background_job_task(self, job_id: str) -> dict:
    try:
        job = execute_payroll_background_job(job_id, task_id=self.request.id or "")
    except RetryablePayrollBackgroundJobError as exc:
        raise self.retry(exc=exc, countdown=min(60, 5 * (2 ** self.request.retries)))
    return {"job_id": str(job.id), "status": job.status, "stage": job.stage}


@shared_task(name="payroll.dispatch_pending_background_jobs")
def dispatch_pending_payroll_background_jobs_task(limit: int = 100) -> dict:
    return {"dispatched": dispatch_pending_payroll_background_jobs(limit=limit)}
