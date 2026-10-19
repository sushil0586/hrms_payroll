"use client";
import Link from "next/link";
import { useState } from "react";
import type {
  LeaveRequestItem,
  AttendanceRegularizationItem,
} from "@/lib/types";
import {
  WorkspaceDataTable,
  WorkspaceStatusBadge,
  WorkspaceFilterBar,
} from "@/components/patterns/workspace-standard";
export function RequestHistory({
  items,
  type,
}: {
  items: (LeaveRequestItem | AttendanceRegularizationItem)[];
  type: "leave" | "attendance";
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const effective = (item: LeaveRequestItem | AttendanceRegularizationItem) =>
    "start_date" in item
      ? `${item.start_date} – ${item.end_date}`
      : item.attendance_date;
  const action = (item: LeaveRequestItem | AttendanceRegularizationItem) =>
    "leave_type" in item
      ? `${item.leave_type} · ${item.request_action === "cancellation_request" ? "Cancellation awaiting approval" : "Leave application"}`
      : "Attendance regularization";
  const rows = items
    .filter((item) =>
      `${item.id} ${item.reason} ${item.status} ${action(item)} ${effective(item)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "effective"
        ? effective(a).localeCompare(effective(b)) || a.id.localeCompare(b.id)
        : (sort === "oldest" ? 1 : -1) *
          (a.created_at.localeCompare(b.created_at) ||
            a.id.localeCompare(b.id)),
    );
  return (
    <>
      <WorkspaceFilterBar>
        <label className="form-field">
          Search this page
          <input
            className="input-control"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
          />
        </label>
        <label className="form-field">
          Sort this page
          <select
            className="input-control"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest submitted</option>
            <option value="oldest">Oldest submitted</option>
            <option value="effective">Effective date</option>
          </select>
        </label>
      </WorkspaceFilterBar>
      <p role="status">
        {rows.length} of {items.length} requests on this page. Search and sort
        apply to the current page.
      </p>
      {rows.length ? (
        <WorkspaceDataTable
          scrollLabel="Request history table, scroll horizontally for details"
          ariaLabel="My requests"
        >
          <thead>
            <tr>
              <th>Request</th>
              <th>Status</th>
              <th>Submitted (UTC)</th>
              <th>Effective dates</th>
              <th>Approver</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{action(item)}</strong>
                  <p>{item.reason}</p>
                </td>
                <td>
                  <WorkspaceStatusBadge
                    tone={
                      item.status === "approved"
                        ? "success"
                        : item.status === "rejected"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {item.status.replaceAll("_", " ")}
                  </WorkspaceStatusBadge>
                </td>
                <td>{item.created_at.slice(0, 10)}</td>
                <td>{effective(item)}</td>
                <td>
                  {item.approval_steps?.find((step) => step.is_current)
                    ?.manager_name || "See approval history"}
                </td>
                <td>
                  <Link
                    prefetch={false}
                    className="button button--secondary"
                    href={
                      type === "leave"
                        ? `/ess/leave?requestId=${encodeURIComponent(item.id)}`
                        : `/ess/attendance?month=${effective(item).slice(0, 7)}&regId=${encodeURIComponent(item.id)}`
                    }
                  >
                    Review request
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </WorkspaceDataTable>
      ) : (
        <p role="status">
          {items.length
            ? "No requests match this page search."
            : "No requests match the selected workflow and status."}
        </p>
      )}
    </>
  );
}
