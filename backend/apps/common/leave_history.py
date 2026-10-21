"""Read-only, employee-scoped Leave history filters and calendar projection."""
import calendar
from datetime import date, timedelta, timezone as datetime_timezone

from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from apps.leave_management.models import LeaveRequest


class EmployeeLeaveHistoryQuery(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True, max_length=200)
    leave_type = serializers.CharField(required=False, allow_blank=True, max_length=50)
    period = serializers.ChoiceField(required=False, choices=["all", "upcoming", "past", "current", "this_year"])
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    day = serializers.DateField(required=False)
    month = serializers.RegexField(r"^\d{4}-(0[1-9]|1[0-2])$", required=False)

    def validate(self, attrs):
        if attrs.get("date_from") and attrs.get("date_to") and attrs["date_to"] < attrs["date_from"]:
            raise serializers.ValidationError({"date_to": "End date cannot be earlier than start date."})
        if attrs.get("month") and not 1 <= int(attrs["month"][:4]) <= 9999:
            raise serializers.ValidationError({"month": "Select a valid calendar month."})
        return attrs


def employee_leave_history_queryset(employee):
    # Tenant binding remains explicit even when an employee FK would normally imply it.
    return LeaveRequest.objects.filter(tenant=employee.tenant, employee=employee).order_by("-created_at", "-id")


def filter_employee_leave_history(queryset, filters, status_filter):
    if status_filter and status_filter != "all":
        queryset = queryset.filter(status=status_filter)
    if query := filters.get("q"):
        queryset = queryset.filter(Q(leave_type__name__icontains=query) | Q(leave_type__code__icontains=query)
            | Q(leave_policy__name__icontains=query) | Q(status__icontains=query) | Q(reason__icontains=query))
    if code := filters.get("leave_type"):
        queryset = queryset.filter(leave_type__code=code)
    # These are UTC calendar filters, not tenant leave-year or chargeability policy.
    today = timezone.now().astimezone(datetime_timezone.utc).date()
    period = filters.get("period", "all")
    if period == "upcoming":
        queryset = queryset.filter(start_date__gt=today)
    elif period == "past":
        queryset = queryset.filter(end_date__lt=today)
    elif period == "current":
        queryset = queryset.filter(start_date__lte=today, end_date__gte=today)
    elif period == "this_year":
        queryset = queryset.filter(start_date__lte=date(today.year, 12, 31), end_date__gte=date(today.year, 1, 1))
    if start := filters.get("date_from"):
        queryset = queryset.filter(end_date__gte=start)
    if end := filters.get("date_to"):
        queryset = queryset.filter(start_date__lte=end)
    return queryset


def employee_leave_calendar(queryset, month):
    """Complete filtered month counts without serializing every request or its workflow."""
    year, number = map(int, month.split("-"))
    first = date(year, number, 1)
    last = date(year, number, calendar.monthrange(year, number)[1])
    deltas = [0] * (last.day + 1)
    intervals = queryset.filter(start_date__lte=last, end_date__gte=first).values_list("start_date", "end_date")
    for start, end in intervals.iterator():
        deltas[(max(start, first) - first).days] += 1
        deltas[(min(end, last) - first).days + 1] -= 1
    counts, running = [], 0
    for index in range(last.day):
        running += deltas[index]
        counts.append({"date": first + timedelta(days=index), "count": running})
    return counts
