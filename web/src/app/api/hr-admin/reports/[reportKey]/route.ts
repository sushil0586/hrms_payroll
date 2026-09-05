import { NextRequest, NextResponse } from "next/server";

import {
  getHrAdminEmployeeDocuments,
  getHrAdminEmployees,
  getHrAdminLifecycleQueue,
  getHrAdminNotifications,
  getMssApprovalInbox,
} from "@/lib/api";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type Props = { params: Promise<{ reportKey: string }> };

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return "message\nNo data available\n";
  }

  const headers = Object.keys(rows[0]);
  const escapeValue = (value: unknown) => {
    const raw = value == null ? "" : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const headerLine = headers.map(escapeValue).join(",");
  const lines = rows.map((row) => headers.map((header) => escapeValue(row[header])).join(","));
  return [headerLine, ...lines].join("\n");
}

async function getDemoRows(reportKey: string) {
  switch (reportKey) {
    case "workforce": {
      const result = await getHrAdminEmployees();
      return result.data.map((item) => ({
        employee_code: item.employee_code,
        full_name: item.full_name,
        work_email: item.work_email,
        phone_number: item.phone_number,
        employment_status: item.employment_status,
        date_of_joining: item.date_of_joining,
        department: item.department,
        designation: item.designation,
        branch: item.branch,
        location: item.location,
        reporting_manager: item.reporting_manager,
      }));
    }
    case "pending-approvals": {
      const result = await getMssApprovalInbox();
      const leaveRows = result.pendingLeave.items.map((item) => ({
        request_type: "leave",
        request_id: item.id,
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        department: item.department,
        designation: item.designation,
        status: item.status,
        request_label: item.leave_type,
        start_date: item.start_date,
        end_date: item.end_date,
        requested_units: item.requested_units,
        reason: item.reason,
        submitted_at: item.created_at,
      }));
      const regularizationRows = result.pendingRegularizations.items.map((item) => ({
        request_type: "attendance_regularization",
        request_id: item.id,
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        department: item.department,
        designation: item.designation,
        status: item.status,
        request_label: item.requested_status,
        start_date: item.attendance_date,
        end_date: item.attendance_date,
        requested_units: "",
        reason: item.reason,
        submitted_at: item.created_at,
      }));
      return [...leaveRows, ...regularizationRows];
    }
    case "document-compliance": {
      const result = await getHrAdminEmployeeDocuments();
      return result.data.items.map((item) => ({
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        category: item.category_name,
        title: item.title,
        document_number: item.document_number,
        status: item.status,
        verification_status: item.verification_status,
        issued_on: item.issued_on,
        expires_on: item.expires_on,
        verified_at: item.verified_at,
        rejection_reason: item.rejection_reason,
      }));
    }
    case "notification-queue": {
      const result = await getHrAdminNotifications();
      return result.data.items.map((item) => ({
        notification_id: item.id,
        event_definition: item.event_definition_name,
        channel: item.channel,
        audience_type: item.audience_type,
        subject_type: item.subject_type,
        subject_identifier: item.subject_identifier,
        recipient_identifier: item.recipient_identifier,
        recipient_address: item.recipient_address,
        status: item.status,
        priority: item.priority,
        scheduled_for: item.scheduled_for,
        sent_at: item.sent_at,
        delivered_at: item.delivered_at,
        read_at: item.read_at,
        title: item.title,
        subject: item.subject,
      }));
    }
    case "lifecycle-queue": {
      const result = await getHrAdminLifecycleQueue();
      return result.data.items.map((item) => ({
        item_type: item.item_type,
        item_label: item.item_label,
        employee_code: item.employee_code,
        employee_name: item.employee_name,
        status: item.status,
        status_label: item.status_label,
        primary_date_label: item.primary_date_label,
        primary_date: item.primary_date,
        secondary_date_label: item.secondary_date_label,
        secondary_date: item.secondary_date,
        owner_value: item.owner_value,
        owner_label: item.owner_label,
        workflow_reference: item.workflow_reference,
        summary: item.summary,
        detail_href: item.detail_href,
      }));
    }
    default:
      return null;
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  const { reportKey } = await params;

  if (API_BASE_URL) {
    const token = request.cookies.get("hrms_access_token")?.value;
    if (!token) {
      return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
    }

    const upstream = await fetch(`${API_BASE_URL}/hr-admin/reports/exports/${reportKey}/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
      cache: "no-store",
    });

    if (upstream.ok) {
      const body = await upstream.text();
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "text/csv",
          "Content-Disposition":
            upstream.headers.get("Content-Disposition") || `attachment; filename="${reportKey}.csv"`,
        },
      });
    }
  }

  const rows = await getDemoRows(reportKey);
  if (!rows) {
    return NextResponse.json({ detail: "Unknown report export." }, { status: 404 });
  }

  return new NextResponse(toCsv(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${reportKey}.csv"`,
    },
  });
}
