from celery import shared_task
from django.db import transaction

from apps.tenants.governance import execute_governance_request
from apps.tenants.models import DataGovernanceRequest, GovernanceRequestStatus


@shared_task(
    bind=True,
    name="tenants.execute_data_governance_request",
    acks_late=True,
    reject_on_worker_lost=True,
    max_retries=2,
    soft_time_limit=300,
    time_limit=330,
)
def execute_data_governance_request_task(self, request_id: str) -> dict:
    try:
        item = execute_governance_request(request_id, task_id=self.request.id or "")
    except Exception as exc:
        with transaction.atomic():
            item = DataGovernanceRequest.objects.select_for_update().filter(id=request_id).first()
            if item and item.status != GovernanceRequestStatus.SUCCEEDED:
                item.status = GovernanceRequestStatus.FAILED
                item.last_error_code = type(exc).__name__[:80]
                item.last_error_message = str(exc)[:2000]
                item.save(update_fields=["status", "last_error_code", "last_error_message", "updated_at"])
        raise self.retry(exc=exc, countdown=min(60, 5 * (2 ** self.request.retries)))
    return {"request_id": str(item.id), "status": item.status}
