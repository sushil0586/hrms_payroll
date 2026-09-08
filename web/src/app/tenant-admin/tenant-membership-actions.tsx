"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { TenantAdminConsole } from "@/lib/types";

function apiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail) {
      return detail;
    }
    return JSON.stringify(payload);
  }
  return fallback;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

type Props = {
  data: TenantAdminConsole;
};

export function TenantMembershipActions({ data }: Props) {
  const router = useRouter();
  const roleOptions = data.membership_management.role_options;
  const activeStatusOptions = data.membership_management.status_options.filter((item) => item.value === "invited" || item.value === "active");
  const defaultRoleId = roleOptions[0]?.id ?? "";
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [membershipStatus, setMembershipStatus] = useState(activeStatusOptions[0]?.value ?? "invited");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(defaultRoleId ? [defaultRoleId] : []);
  const [rowRoleSelections, setRowRoleSelections] = useState<Record<string, string>>({});
  const [busyRef, setBusyRef] = useState("");
  const [notice, setNotice] = useState("");

  const actionLabels = useMemo(
    () => Object.fromEntries(data.membership_management.available_actions.map((action) => [action.value, action.label])),
    [data.membership_management.available_actions]
  );

  function toggleInviteRole(roleId: string) {
    setSelectedRoleIds((current) => (current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId]));
  }

  async function inviteMember() {
    setBusyRef("invite");
    setNotice("");
    const response = await fetch("/api/tenant-admin/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        membership_status: membershipStatus,
        role_ids: selectedRoleIds,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setBusyRef("");
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Membership invite could not be saved."));
      return;
    }
    setNotice(result.generated_password ? `Invite saved. Temporary password was generated.` : "Invite saved.");
    setEmail("");
    setUsername("");
    setFirstName("");
    setLastName("");
    router.refresh();
  }

  async function runMembershipAction(membershipId: string, action: "activate" | "suspend" | "revoke" | "update_roles") {
    setBusyRef(`${membershipId}:${action}`);
    setNotice("");
    const body =
      action === "update_roles"
        ? {
            action,
            role_ids: [rowRoleSelections[membershipId]].filter(Boolean),
          }
        : { action };
    const response = await fetch(`/api/tenant-admin/memberships/${membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setBusyRef("");
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Membership action could not be saved."));
      return;
    }
    setNotice(`${actionLabels[action] ?? titleCase(action)} saved.`);
    router.refresh();
  }

  return (
    <div className="tenant-membership-actions">
      <div className="tenant-membership-actions__invite">
        <div className="tenant-console-panel__header">
          <div>
            <span className="workspace-card__eyebrow">Member mutations</span>
            <h2>{actionLabels.invite ?? "Invite member"}</h2>
          </div>
          <span className="record-chip">{data.seat_usage.current_value}/{data.seat_usage.limit_value || "unlimited"} seats</span>
        </div>
        <div className="tenant-membership-form-grid">
          <label>
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@company.com" />
          </label>
          <label>
            <span>Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="person.name" />
          </label>
          <label>
            <span>First name</span>
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label>
            <span>Last name</span>
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
          <label>
            <span>Status</span>
            <select value={membershipStatus} onChange={(event) => setMembershipStatus(event.target.value)}>
              {activeStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="tenant-role-picker">
          {roleOptions.map((role) => (
            <label key={role.id}>
              <input checked={selectedRoleIds.includes(role.id)} onChange={() => toggleInviteRole(role.id)} type="checkbox" />
              <span>{role.name}</span>
            </label>
          ))}
        </div>
        <div className="tenant-membership-actions__footer">
          <button className="button button--primary" disabled={busyRef === "invite" || !email || !username || selectedRoleIds.length === 0} onClick={inviteMember} type="button">
            {busyRef === "invite" ? "Saving" : actionLabels.invite ?? "Invite member"}
          </button>
          {notice ? <span role="status">{notice}</span> : null}
        </div>
      </div>

      <div className="tenant-membership-actions__members">
        {data.membership_management.recent_memberships.map((membership) => {
          const rowRole = rowRoleSelections[membership.id] ?? membership.role_ids[0] ?? defaultRoleId;
          return (
            <div className="tenant-membership-row" key={membership.id}>
              <div>
                <strong>{membership.display_name}</strong>
                <span>{membership.email}</span>
                <span>{membership.roles.map((role) => role.name).join(", ") || "No role"}</span>
              </div>
              <span className="record-chip">{titleCase(membership.membership_status)}</span>
              <select value={rowRole} onChange={(event) => setRowRoleSelections((current) => ({ ...current, [membership.id]: event.target.value }))}>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <div className="tenant-membership-row__actions">
                <button className="button button--secondary" disabled={busyRef.startsWith(`${membership.id}:`)} onClick={() => runMembershipAction(membership.id, "update_roles")} type="button">
                  {actionLabels.update_roles ?? "Update roles"}
                </button>
                {membership.membership_status === "active" ? (
                  <button className="button button--secondary" disabled={busyRef.startsWith(`${membership.id}:`)} onClick={() => runMembershipAction(membership.id, "suspend")} type="button">
                    {actionLabels.suspend ?? "Suspend"}
                  </button>
                ) : (
                  <button className="button button--secondary" disabled={busyRef.startsWith(`${membership.id}:`)} onClick={() => runMembershipAction(membership.id, "activate")} type="button">
                    {actionLabels.activate ?? "Activate"}
                  </button>
                )}
                <button className="button button--ghost" disabled={busyRef.startsWith(`${membership.id}:`)} onClick={() => runMembershipAction(membership.id, "revoke")} type="button">
                  {actionLabels.revoke ?? "Revoke"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
