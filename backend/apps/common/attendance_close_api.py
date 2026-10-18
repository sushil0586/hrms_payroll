from django.utils.dateparse import parse_date
from rest_framework import response, serializers, status
from rest_framework.views import APIView

from apps.attendance.models import AttendancePeriodClose
from apps.attendance.services import AttendanceCloseError, reconcile_attendance_period, transition_attendance_close
from apps.common.api_views import HrAdminContextMixin
from apps.organizations.models import LegalEntity


def serialize_close(item):
    def actor_name(actor):
        if not actor:
            return "System"
        return actor.preferred_name or " ".join(
            value for value in (actor.first_name, actor.last_name) if value
        ) or actor.employee_code

    return {
        "id": str(item.id), "legal_entity_id": str(item.legal_entity_id),
        "legal_entity_name": item.legal_entity.name, "period_start": item.period_start,
        "period_end": item.period_end, "version": item.version, "status": item.status,
        "employee_count": item.employee_count, "attendance_record_count": item.attendance_record_count,
        "blocker_count": item.blocker_count, "snapshot_hash": item.snapshot_hash,
        "reconciliation_snapshot": item.reconciliation_snapshot, "reopen_reason": item.reopen_reason,
        "submitted_at": item.submitted_at, "approved_at": item.approved_at,
        "closed_at": item.closed_at, "reopened_at": item.reopened_at,
        "events": [{"id": str(event.id), "event_type": event.event_type, "reason": event.reason,
                    "actor": actor_name(event.actor), "occurred_at": event.occurred_at,
                    "evidence_snapshot": event.evidence_snapshot} for event in item.events.select_related("actor")],
    }


class HrAdminAttendanceCloseListCreateView(HrAdminContextMixin, APIView):
    def get(self, request):
        actor = self.get_employee()
        if not actor:
            return response.Response({"detail": "No active employee context found."}, status=404)
        self.require_tenant_permission(actor.tenant, "attendance.view")
        items = AttendancePeriodClose.objects.filter(tenant=actor.tenant).select_related("legal_entity").prefetch_related("events__actor")[:100]
        entities = LegalEntity.objects.filter(tenant=actor.tenant, is_active=True).values("id", "name", "code")
        return response.Response({"items": [serialize_close(item) for item in items], "legal_entities": list(entities)})

    def post(self, request):
        actor = self.get_employee()
        if not actor:
            return response.Response({"detail": "No active employee context found."}, status=404)
        self.require_tenant_permission(actor.tenant, "attendance.close.manage")
        start = parse_date(str(request.data.get("period_start") or ""))
        end = parse_date(str(request.data.get("period_end") or ""))
        entity = LegalEntity.objects.filter(tenant=actor.tenant, id=request.data.get("legal_entity_id")).first()
        if not start or not end or end < start:
            raise serializers.ValidationError({"period": "Provide a valid ordered attendance period."})
        if not entity:
            raise serializers.ValidationError({"legal_entity_id": "Invalid legal entity selection."})
        key = str(request.data.get("idempotency_key") or "").strip()
        if not key:
            raise serializers.ValidationError({"idempotency_key": "This field is required."})
        try:
            item = reconcile_attendance_period(tenant=actor.tenant, legal_entity=entity, period_start=start, period_end=end, actor=actor, idempotency_key=key)
        except AttendanceCloseError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc
        return response.Response(serialize_close(item), status=status.HTTP_201_CREATED)


class HrAdminAttendanceCloseDetailView(HrAdminContextMixin, APIView):
    def get(self, request, item_id):
        actor = self.get_employee()
        if not actor:
            return response.Response({"detail": "No active employee context found."}, status=404)
        self.require_tenant_permission(actor.tenant, "attendance.view")
        item = AttendancePeriodClose.objects.filter(tenant=actor.tenant, id=item_id).select_related("legal_entity").first()
        if not item:
            return response.Response({"detail": "Attendance close not found."}, status=404)
        return response.Response(serialize_close(item))


class HrAdminAttendanceCloseTransitionView(HrAdminContextMixin, APIView):
    def post(self, request, item_id, action):
        actor = self.get_employee()
        if not actor:
            return response.Response({"detail": "No active employee context found."}, status=404)
        permission = "attendance.close.manage" if action == "submit" else "attendance.close.approve"
        self.require_tenant_permission(actor.tenant, permission)
        item = AttendancePeriodClose.objects.filter(tenant=actor.tenant, id=item_id).select_related("legal_entity").first()
        if not item:
            return response.Response({"detail": "Attendance close not found."}, status=404)
        try:
            item = transition_attendance_close(close=item, actor=actor, action=action, reason=str(request.data.get("reason") or ""))
        except AttendanceCloseError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc
        return response.Response(serialize_close(item))
