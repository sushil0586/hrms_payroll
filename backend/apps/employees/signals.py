"""Employee lifecycle hooks that keep active approval ownership synchronized."""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.attendance.models import AttendanceRegularization, RegularizationStatus
from apps.employees.models import Employee
from apps.leave_management.models import LeaveRequest, LeaveRequestStatus
from apps.workflows.services import reassign_pending_manager_workflows


@receiver(pre_save, sender=Employee)
def capture_previous_reporting_manager(sender, instance, raw=False, update_fields=None, **kwargs):
    if raw or not instance.pk or (update_fields is not None and "reporting_manager" not in update_fields):
        return
    previous = (
        sender.objects.filter(pk=instance.pk)
        .values("reporting_manager_id", "reporting_manager__membership_id")
        .first()
    )
    instance._previous_reporting_manager_id = previous["reporting_manager_id"] if previous else None
    instance._previous_manager_membership_id = previous["reporting_manager__membership_id"] if previous else None


@receiver(post_save, sender=Employee)
def synchronize_pending_manager_assignments(sender, instance, created, raw=False, update_fields=None, **kwargs):
    if raw or created or not hasattr(instance, "_previous_reporting_manager_id"):
        return
    if instance._previous_reporting_manager_id == instance.reporting_manager_id:
        return
    new_membership = instance.reporting_manager.membership if instance.reporting_manager_id else None
    eligible_workflow_ids = list(
        LeaveRequest.objects.filter(
            employee=instance,
            status__in=[LeaveRequestStatus.PENDING, LeaveRequestStatus.PARTIALLY_APPROVED],
        ).exclude(workflow_reference="").values_list("workflow_reference", flat=True)
    )
    eligible_workflow_ids.extend(
        AttendanceRegularization.objects.filter(
            employee=instance,
            status=RegularizationStatus.PENDING,
        ).exclude(workflow_reference="").values_list("workflow_reference", flat=True)
    )
    reassign_pending_manager_workflows(
        tenant_id=instance.tenant_id,
        employee_id=instance.id,
        previous_manager_membership_id=instance._previous_manager_membership_id,
        new_manager_membership=new_membership,
        eligible_workflow_ids=eligible_workflow_ids,
    )
