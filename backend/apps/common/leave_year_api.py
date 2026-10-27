"""Authorized operational API for governed leave-year periods and close runs."""

from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.api_views import HrAdminContextMixin, TenantAdminContextMixin
from apps.common.selectors import record_saas_commercial_audit_event
from apps.leave_management.models import (
    LeavePolicy,
    LeavePolicyPeriod,
    LeavePolicyPeriodAction,
    LeavePolicyPeriodStatus,
    LeaveYearCloseRun,
    LeaveYearCloseRunStatus,
)
from apps.leave_management.year_end_services import (
    build_historical_leave_classification_report,
    create_leave_year_close_run,
    preview_leave_year_close,
    transition_leave_policy_period,
)
from apps.organizations.models import LegalEntity


class LeavePolicyPeriodWriteSerializer(serializers.Serializer):
    leave_policy_id = serializers.UUIDField()
    legal_entity_id = serializers.UUIDField(required=False, allow_null=True)
    code = serializers.CharField(max_length=60)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    status = serializers.ChoiceField(choices=[LeavePolicyPeriodStatus.PLANNED, LeavePolicyPeriodStatus.OPEN], default=LeavePolicyPeriodStatus.PLANNED)

    def validate(self, attrs):
        if attrs["start_date"] > attrs["end_date"]:
            raise serializers.ValidationError({"end_date": "End date must be on or after start date."})
        return attrs


class LeaveYearCloseCommandSerializer(serializers.Serializer):
    source_period_id = serializers.UUIDField()
    target_period_id = serializers.UUIDField()
    carry_forward_cap = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal("0"))
    expiring_units = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal("0"), default=Decimal("0"))
    expiry_date = serializers.DateField(required=False, allow_null=True)
    scheduled_for = serializers.DateTimeField(required=False, allow_null=True)
    idempotency_key = serializers.CharField(max_length=160)
    confirmation = serializers.CharField(required=False, allow_blank=True)


class LeavePeriodTransitionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=LeavePolicyPeriodAction.choices)
    reason = serializers.CharField(min_length=8)
    idempotency_key = serializers.CharField(max_length=160)


def _period_payload(item: LeavePolicyPeriod) -> dict:
    return {
        "id": str(item.id), "leave_policy_id": str(item.leave_policy_id), "leave_policy_code": item.leave_policy.code,
        "leave_policy_name": item.leave_policy.name, "legal_entity_id": str(item.legal_entity_id) if item.legal_entity_id else None,
        "legal_entity_name": item.legal_entity.name if item.legal_entity else None, "code": item.code,
        "start_date": item.start_date.isoformat(), "end_date": item.end_date.isoformat(), "status": item.status,
        "policy_snapshot": item.policy_snapshot, "closed_at": item.closed_at, "reopened_at": item.reopened_at,
        "reopen_count": item.reopen_count,
    }


def _run_payload(item: LeaveYearCloseRun) -> dict:
    return {
        "id": str(item.id), "source_period_id": str(item.source_period_id), "target_period_id": str(item.target_period_id),
        "leave_policy_id": str(item.leave_policy_id), "leave_policy_name": item.leave_policy.name,
        "status": item.status, "idempotency_key": item.idempotency_key, "scheduled_for": item.scheduled_for,
        "dispatched_at": item.dispatched_at, "started_at": item.started_at, "completed_at": item.completed_at,
        "attempt_count": item.attempt_count, "processed_count": item.processed_count, "failed_count": item.failed_count,
        "request_snapshot": item.request_snapshot, "result_snapshot": item.result_snapshot,
        "error_snapshot": item.error_snapshot, "celery_task_id": item.celery_task_id,
    }


class LeaveYearApiBase(APIView):
    def context(self):
        employee = self.get_employee()
        tenant = employee.tenant if employee else getattr(self, "get_tenant", lambda: None)()
        if not tenant:
            return None, None
        return tenant, employee

    def require(self, tenant, permission):
        self.require_tenant_permission(tenant, permission)


class LeaveYearOptionsBase(LeaveYearApiBase):
    def get(self, request):
        tenant, _ = self.context()
        if not tenant:
            return Response({"detail": "No active tenant context found."}, status=404)
        self.require(tenant, "leave.periods.view")
        return Response({
            "leave_policies": [
                {"id": str(item.id), "name": item.name}
                for item in LeavePolicy.objects.filter(tenant=tenant).order_by("name")
            ],
            "legal_entities": [
                {"id": str(item.id), "name": item.name}
                for item in LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")
            ],
        })


class LeavePolicyPeriodListCreateBase(LeaveYearApiBase):
    def get(self, request):
        tenant, _ = self.context()
        if not tenant:
            return Response({"detail": "No active tenant context found."}, status=404)
        self.require(tenant, "leave.periods.view")
        items = LeavePolicyPeriod.objects.filter(tenant=tenant).select_related("leave_policy", "legal_entity")
        return Response([_period_payload(item) for item in items])

    def post(self, request):
        tenant, _ = self.context()
        if not tenant:
            return Response({"detail": "No active tenant context found."}, status=404)
        self.require(tenant, "leave.periods.manage")
        serializer = LeavePolicyPeriodWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        policy = LeavePolicy.objects.filter(tenant=tenant, id=data["leave_policy_id"]).first()
        entity = LegalEntity.objects.filter(tenant=tenant, id=data.get("legal_entity_id")).first() if data.get("legal_entity_id") else None
        if not policy:
            return Response({"leave_policy_id": ["Leave policy not found in this tenant."]}, status=400)
        if data.get("legal_entity_id") and not entity:
            return Response({"legal_entity_id": ["Legal entity not found in this tenant."]}, status=400)
        try:
            with transaction.atomic():
                item = LeavePolicyPeriod.objects.create(
                    tenant=tenant, leave_policy=policy, legal_entity=entity, code=data["code"].strip(),
                    start_date=data["start_date"], end_date=data["end_date"], status=data["status"],
                    policy_snapshot={"policy_id": str(policy.id), "policy_code": policy.code, "policy_name": policy.name,
                                     "annual_entitlement": str(policy.annual_entitlement), "max_carry_forward": str(policy.max_carry_forward),
                                     "config_snapshot": policy.config_snapshot},
                )
                record_saas_commercial_audit_event(
                    tenant,
                    event_type="leave_policy_period_created",
                    actor_identifier=getattr(request.user, "username", ""),
                    source_ref="hrms.leave_year.configuration.audit.v1",
                    event_snapshot={
                        "action": "created",
                        "leave_policy_period_id": str(item.id),
                        "leave_policy_id": str(policy.id),
                        "legal_entity_id": str(entity.id) if entity else None,
                        "code": item.code,
                        "start_date": item.start_date.isoformat(),
                        "end_date": item.end_date.isoformat(),
                        "status": item.status,
                        "permission": "leave.periods.manage",
                    },
                )
        except IntegrityError as exc:
            return Response({"detail": "This leave-year period overlaps or duplicates an existing policy scope."}, status=409)
        return Response(_period_payload(item), status=status.HTTP_201_CREATED)


class LeaveYearPreviewBase(LeaveYearApiBase):
    def post(self, request):
        tenant, _ = self.context()
        if not tenant:
            return Response({"detail": "No active tenant context found."}, status=404)
        self.require(tenant, "leave.periods.close")
        serializer = LeaveYearCloseCommandSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        source = LeavePolicyPeriod.objects.filter(tenant=tenant, id=data["source_period_id"]).first()
        target = LeavePolicyPeriod.objects.filter(tenant=tenant, id=data["target_period_id"]).first()
        if not source or not target:
            return Response({"detail": "Source or target leave period was not found."}, status=404)
        try:
            payload = preview_leave_year_close(
                source_period=source, target_period=target, carry_forward_cap=data["carry_forward_cap"],
                expiring_units=data["expiring_units"], expiry_date=data.get("expiry_date"),
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        payload["confirmation_phrase"] = f"CLOSE {source.code}"
        return Response(payload)


class LeaveYearCloseRunListCreateBase(LeaveYearApiBase):
    def get(self, request):
        tenant, _ = self.context()
        if not tenant:
            return Response({"detail": "No active tenant context found."}, status=404)
        self.require(tenant, "leave.periods.view")
        items = LeaveYearCloseRun.objects.filter(tenant=tenant).select_related("leave_policy")[:100]
        return Response([_run_payload(item) for item in items])

    def post(self, request):
        tenant, employee = self.context()
        if not tenant:
            return Response({"detail": "No active tenant context found."}, status=404)
        self.require(tenant, "leave.periods.close")
        serializer = LeaveYearCloseCommandSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        source = LeavePolicyPeriod.objects.filter(tenant=tenant, id=data["source_period_id"]).first()
        target = LeavePolicyPeriod.objects.filter(tenant=tenant, id=data["target_period_id"]).first()
        if not source or not target:
            return Response({"detail": "Source or target leave period was not found."}, status=404)
        expected_confirmation = f"CLOSE {source.code}"
        if data.get("confirmation", "").strip() != expected_confirmation:
            return Response({"confirmation": [f"Enter {expected_confirmation} to authorize this close."]}, status=400)
        try:
            run = create_leave_year_close_run(
                source_period=source, target_period=target, actor_employee=employee,
                idempotency_key=data["idempotency_key"], carry_forward_cap=data["carry_forward_cap"],
                expiring_units=data["expiring_units"], expiry_date=data.get("expiry_date"),
                scheduled_for=data.get("scheduled_for"),
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        return Response(_run_payload(run), status=status.HTTP_202_ACCEPTED)


class LeaveYearCloseRunDetailBase(LeaveYearApiBase):
    def get(self, request, item_id):
        tenant, _ = self.context()
        if not tenant:
            return Response({"detail": "No active tenant context found."}, status=404)
        self.require(tenant, "leave.periods.view")
        item = LeaveYearCloseRun.objects.filter(tenant=tenant, id=item_id).select_related("leave_policy").first()
        return Response(_run_payload(item)) if item else Response({"detail": "Leave-year close run not found."}, status=404)


class LeavePolicyPeriodTransitionBase(LeaveYearApiBase):
    def post(self, request, item_id):
        tenant, _ = self.context()
        if not tenant:
            return Response({"detail": "No active tenant context found."}, status=404)
        period = LeavePolicyPeriod.objects.filter(tenant=tenant, id=item_id).select_related("leave_policy", "legal_entity").first()
        if not period:
            return Response({"detail": "Leave period not found."}, status=404)
        serializer = LeavePeriodTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            period = transition_leave_policy_period(policy_period=period, action=data["action"], actor=request.user,
                                                     reason=data["reason"], idempotency_key=data["idempotency_key"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        return Response(_period_payload(period))


class LeaveHistoricalClassificationBase(LeaveYearApiBase):
    def get(self, request):
        tenant, _ = self.context()
        if not tenant:
            return Response({"detail": "No active tenant context found."}, status=404)
        self.require(tenant, "leave.periods.view")
        limit = min(max(int(request.query_params.get("limit", 200)), 1), 1000)
        return Response(build_historical_leave_classification_report(tenant=tenant, limit=limit))


class HrAdminLeavePolicyPeriodListCreateView(HrAdminContextMixin, LeavePolicyPeriodListCreateBase): pass
class TenantAdminLeavePolicyPeriodListCreateView(TenantAdminContextMixin, LeavePolicyPeriodListCreateBase): pass
class TenantAdminLeaveYearOptionsView(TenantAdminContextMixin, LeaveYearOptionsBase): pass
class HrAdminLeaveYearPreviewView(HrAdminContextMixin, LeaveYearPreviewBase): pass
class TenantAdminLeaveYearPreviewView(TenantAdminContextMixin, LeaveYearPreviewBase): pass
class HrAdminLeaveYearCloseRunListCreateView(HrAdminContextMixin, LeaveYearCloseRunListCreateBase): pass
class TenantAdminLeaveYearCloseRunListCreateView(TenantAdminContextMixin, LeaveYearCloseRunListCreateBase): pass
class HrAdminLeaveYearCloseRunDetailView(HrAdminContextMixin, LeaveYearCloseRunDetailBase): pass
class TenantAdminLeaveYearCloseRunDetailView(TenantAdminContextMixin, LeaveYearCloseRunDetailBase): pass
class HrAdminLeavePolicyPeriodTransitionView(HrAdminContextMixin, LeavePolicyPeriodTransitionBase): pass
class TenantAdminLeavePolicyPeriodTransitionView(TenantAdminContextMixin, LeavePolicyPeriodTransitionBase): pass
class HrAdminLeaveHistoricalClassificationView(HrAdminContextMixin, LeaveHistoricalClassificationBase): pass
class TenantAdminLeaveHistoricalClassificationView(TenantAdminContextMixin, LeaveHistoricalClassificationBase): pass
