"""Tenant-scoped administration API for DB-2 fiscal calendars and periods."""

from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.db import DatabaseError, IntegrityError, transaction
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.api_views import TenantAdminContextMixin
from apps.organizations.models import LegalEntity
from apps.payroll.fiscal_services import transition_accounting_period, transition_fiscal_year
from apps.payroll.models import (
    AccountingPeriod,
    AccountingPeriodAction,
    AccountingPeriodKind,
    AccountingPeriodStatus,
    FiscalCalendar,
    FiscalCalendarStatus,
    FiscalYear,
    FiscalYearAction,
    FiscalYearStatus,
)


class FiscalCalendarWriteSerializer(serializers.Serializer):
    legal_entity_id = serializers.UUIDField(required=False, allow_null=True)
    code = serializers.SlugField(max_length=60)
    name = serializers.CharField(max_length=255)
    start_month = serializers.IntegerField(min_value=1, max_value=12)
    start_day = serializers.IntegerField(min_value=1, max_value=31)
    timezone = serializers.CharField(max_length=64, default="UTC")
    country_code = serializers.CharField(max_length=2, allow_blank=True, default="")
    version = serializers.IntegerField(min_value=1, default=1)
    status = serializers.ChoiceField(choices=FiscalCalendarStatus.choices, default=FiscalCalendarStatus.DRAFT)
    is_default = serializers.BooleanField(default=False)
    effective_from = serializers.DateField()
    effective_to = serializers.DateField(required=False, allow_null=True)


class FiscalYearWriteSerializer(serializers.Serializer):
    calendar_id = serializers.UUIDField()
    code = serializers.CharField(max_length=40)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    status = serializers.ChoiceField(choices=[FiscalYearStatus.PLANNED, FiscalYearStatus.OPEN], default=FiscalYearStatus.PLANNED)
    version = serializers.IntegerField(min_value=1, default=1)


class AccountingPeriodWriteSerializer(serializers.Serializer):
    fiscal_year_id = serializers.UUIDField()
    legal_entity_id = serializers.UUIDField(required=False, allow_null=True)
    code = serializers.CharField(max_length=40)
    name = serializers.CharField(max_length=255)
    sequence = serializers.IntegerField(min_value=1, max_value=99)
    kind = serializers.ChoiceField(choices=AccountingPeriodKind.choices, default=AccountingPeriodKind.STANDARD)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    status = serializers.ChoiceField(choices=[AccountingPeriodStatus.PLANNED, AccountingPeriodStatus.OPEN], default=AccountingPeriodStatus.PLANNED)


class PeriodTransitionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=AccountingPeriodAction.choices)
    reason = serializers.CharField(min_length=8)
    request_key = serializers.CharField(max_length=120)


class YearTransitionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=FiscalYearAction.choices)
    reason = serializers.CharField(min_length=8)
    request_key = serializers.CharField(max_length=120)


def _calendar_payload(item):
    return {
        "id": str(item.id), "legal_entity_id": str(item.legal_entity_id) if item.legal_entity_id else None,
        "legal_entity_name": item.legal_entity.name if item.legal_entity else None, "code": item.code,
        "name": item.name, "start_month": item.start_month, "start_day": item.start_day,
        "timezone": item.timezone, "country_code": item.country_code, "version": item.version,
        "status": item.status, "is_default": item.is_default, "effective_from": item.effective_from,
        "effective_to": item.effective_to,
    }


def _year_payload(item):
    return {
        "id": str(item.id), "calendar_id": str(item.calendar_id), "calendar_name": item.calendar.name,
        "code": item.code, "start_date": item.start_date, "end_date": item.end_date,
        "status": item.status, "version": item.version,
        "status_events": [{"action": event.action, "previous_status": event.previous_status,
                           "next_status": event.next_status, "reason": event.reason,
                           "request_key": event.request_key, "actor_id": str(event.actor_id),
                           "created_at": event.created_at} for event in item.status_events.all()],
    }


def _period_payload(item):
    return {
        "id": str(item.id), "fiscal_year_id": str(item.fiscal_year_id),
        "legal_entity_id": str(item.legal_entity_id) if item.legal_entity_id else None,
        "legal_entity_name": item.legal_entity.name if item.legal_entity else None,
        "code": item.code, "name": item.name, "sequence": item.sequence, "kind": item.kind,
        "start_date": item.start_date, "end_date": item.end_date, "status": item.status,
        "closed_at": item.closed_at, "reopened_at": item.reopened_at, "reopen_count": item.reopen_count,
        "status_events": [{"action": event.action, "previous_status": event.previous_status,
                           "next_status": event.next_status, "reason": event.reason,
                           "request_key": event.request_key, "actor_id": str(event.actor_id),
                           "created_at": event.created_at} for event in item.status_events.all()],
    }


def _validation_response(exc):
    detail = exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}
    return Response(detail, status=status.HTTP_400_BAD_REQUEST)


class FiscalApiBase(APIView):
    def tenant(self):
        return self.get_tenant()

    def require_view(self, tenant):
        self.require_any_tenant_permission(
            tenant, "tenant.settings.view", "tenant.settings.manage", "finance.periods.close", "finance.periods.reopen"
        )


class FiscalWorkspaceView(TenantAdminContextMixin, FiscalApiBase):
    def get(self, request):
        tenant = self.tenant()
        self.require_view(tenant)
        calendars = FiscalCalendar.objects.filter(tenant=tenant).select_related("legal_entity")
        years = FiscalYear.objects.filter(tenant=tenant).select_related("calendar").prefetch_related("status_events")
        periods = AccountingPeriod.objects.filter(tenant=tenant).select_related("fiscal_year", "legal_entity").prefetch_related("status_events")
        entities = LegalEntity.objects.filter(tenant=tenant, is_active=True).order_by("name")
        return Response({
            "calendars": [_calendar_payload(item) for item in calendars],
            "fiscal_years": [_year_payload(item) for item in years],
            "accounting_periods": [_period_payload(item) for item in periods],
            "legal_entities": [{"id": str(item.id), "code": item.code, "name": item.name} for item in entities],
        })


class FiscalCalendarListCreateView(TenantAdminContextMixin, FiscalApiBase):
    def post(self, request):
        tenant = self.tenant()
        self.require_tenant_permission(tenant, "tenant.settings.manage")
        serializer = FiscalCalendarWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        entity = LegalEntity.objects.filter(tenant=tenant, id=data.get("legal_entity_id")).first() if data.get("legal_entity_id") else None
        if data.get("legal_entity_id") and not entity:
            return Response({"legal_entity_id": ["Legal entity not found in this tenant."]}, status=400)
        try:
            item = FiscalCalendar.objects.create(tenant=tenant, legal_entity=entity, **{key: value for key, value in data.items() if key != "legal_entity_id"})
        except DjangoValidationError as exc:
            return _validation_response(exc)
        except (IntegrityError, DatabaseError):
            return Response({"detail": "This fiscal calendar conflicts with an existing tenant or entity calendar."}, status=409)
        return Response(_calendar_payload(item), status=status.HTTP_201_CREATED)


class FiscalCalendarDetailView(TenantAdminContextMixin, FiscalApiBase):
    def patch(self, request, item_id):
        tenant = self.tenant()
        self.require_tenant_permission(tenant, "tenant.settings.manage")
        item = FiscalCalendar.objects.filter(tenant=tenant, id=item_id).select_related("legal_entity").first()
        if not item:
            return Response({"detail": "Fiscal calendar not found."}, status=404)
        serializer = FiscalCalendarWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if "legal_entity_id" in data:
            entity = LegalEntity.objects.filter(tenant=tenant, id=data["legal_entity_id"]).first() if data["legal_entity_id"] else None
            if data["legal_entity_id"] and not entity:
                return Response({"legal_entity_id": ["Legal entity not found in this tenant."]}, status=400)
            item.legal_entity = entity
        for field in ["code", "name", "start_month", "start_day", "timezone", "country_code", "version", "status", "is_default", "effective_from", "effective_to"]:
            if field in data:
                setattr(item, field, data[field])
        try:
            item.save()
        except DjangoValidationError as exc:
            return _validation_response(exc)
        except (IntegrityError, DatabaseError):
            return Response({"detail": "This fiscal calendar conflicts with an existing tenant or entity calendar."}, status=409)
        return Response(_calendar_payload(item))


class FiscalYearListCreateView(TenantAdminContextMixin, FiscalApiBase):
    def post(self, request):
        tenant = self.tenant()
        self.require_tenant_permission(tenant, "tenant.settings.manage")
        serializer = FiscalYearWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        calendar = FiscalCalendar.objects.filter(tenant=tenant, id=data["calendar_id"]).first()
        if not calendar:
            return Response({"calendar_id": ["Fiscal calendar not found in this tenant."]}, status=400)
        try:
            item = FiscalYear.objects.create(tenant=tenant, calendar=calendar, **{key: value for key, value in data.items() if key != "calendar_id"})
        except DjangoValidationError as exc:
            return _validation_response(exc)
        except (IntegrityError, DatabaseError):
            return Response({"detail": "This financial year duplicates or overlaps an existing year."}, status=409)
        return Response(_year_payload(item), status=status.HTTP_201_CREATED)


class AccountingPeriodListCreateView(TenantAdminContextMixin, FiscalApiBase):
    def post(self, request):
        tenant = self.tenant()
        self.require_tenant_permission(tenant, "tenant.settings.manage")
        serializer = AccountingPeriodWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        year = FiscalYear.objects.filter(tenant=tenant, id=data["fiscal_year_id"]).first()
        entity = LegalEntity.objects.filter(tenant=tenant, id=data.get("legal_entity_id")).first() if data.get("legal_entity_id") else None
        if not year:
            return Response({"fiscal_year_id": ["Financial year not found in this tenant."]}, status=400)
        if data.get("legal_entity_id") and not entity:
            return Response({"legal_entity_id": ["Legal entity not found in this tenant."]}, status=400)
        try:
            item = AccountingPeriod.objects.create(tenant=tenant, fiscal_year=year, legal_entity=entity, **{
                key: value for key, value in data.items() if key not in {"fiscal_year_id", "legal_entity_id"}
            })
        except DjangoValidationError as exc:
            return _validation_response(exc)
        except (IntegrityError, DatabaseError):
            return Response({"detail": "This accounting period duplicates or overlaps an existing period."}, status=409)
        return Response(_period_payload(item), status=status.HTTP_201_CREATED)


class AccountingPeriodTransitionView(TenantAdminContextMixin, FiscalApiBase):
    def post(self, request, item_id):
        tenant = self.tenant()
        item = AccountingPeriod.objects.filter(tenant=tenant, id=item_id).first()
        if not item:
            return Response({"detail": "Accounting period not found."}, status=404)
        serializer = PeriodTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = transition_accounting_period(accounting_period=item, actor=request.user, **serializer.validated_data)
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=403)
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(_period_payload(AccountingPeriod.objects.prefetch_related("status_events").get(id=item.id)))


class FiscalYearTransitionView(TenantAdminContextMixin, FiscalApiBase):
    def post(self, request, item_id):
        tenant = self.tenant()
        item = FiscalYear.objects.filter(tenant=tenant, id=item_id).first()
        if not item:
            return Response({"detail": "Financial year not found."}, status=404)
        serializer = YearTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = transition_fiscal_year(fiscal_year=item, actor=request.user, **serializer.validated_data)
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=403)
        except DjangoValidationError as exc:
            return _validation_response(exc)
        return Response(_year_payload(FiscalYear.objects.select_related("calendar").prefetch_related("status_events").get(id=item.id)))
