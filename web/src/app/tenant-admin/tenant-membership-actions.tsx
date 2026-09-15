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

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type Props = {
  data: TenantAdminConsole;
};

type EditingMember = TenantAdminConsole["membership_management"]["recent_memberships"][number] | null;

export function TenantMembershipActions({ data }: Props) {
  const router = useRouter();
  const roleOptions = data.membership_management.role_options;
  const activeStatusOptions = data.membership_management.status_options.filter((item) => item.value === "invited" || item.value === "active");
  const defaultRoleId = roleOptions[0]?.id ?? "";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<EditingMember>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [membershipStatus, setMembershipStatus] = useState(activeStatusOptions[0]?.value ?? "invited");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(defaultRoleId ? [defaultRoleId] : []);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [busyRef, setBusyRef] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  const actionLabels = useMemo(
    () => Object.fromEntries(data.membership_management.available_actions.map((action) => [action.value, action.label])),
    [data.membership_management.available_actions]
  );

  const inviteValidation = useMemo(() => {
    if (!email.trim()) return "Email is required.";
    if (!emailLooksValid(email.trim())) return "Enter a valid work email address.";
    if (!username.trim()) return "Username is required.";
    if (!selectedRoleIds.length) return "Select at least one role.";
    return "";
  }, [email, selectedRoleIds.length, username]);

  const editValidation = editRoleIds.length ? "" : "Select at least one role before saving.";

  function resetInviteForm() {
    setEmail("");
    setUsername("");
    setFirstName("");
    setLastName("");
    setMembershipStatus(activeStatusOptions[0]?.value ?? "invited");
    setSelectedRoleIds(defaultRoleId ? [defaultRoleId] : []);
    setFormError("");
  }

  function closeInviteDialog() {
    setInviteOpen(false);
    resetInviteForm();
  }

  function openEditDialog(member: NonNullable<EditingMember>) {
    setEditingMember(member);
    setEditRoleIds(member.role_ids.length ? member.role_ids : defaultRoleId ? [defaultRoleId] : []);
    setFormError("");
    setNotice("");
  }

  function toggleInviteRole(roleId: string) {
    setSelectedRoleIds((current) => (current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId]));
  }

  function toggleEditRole(roleId: string) {
    setEditRoleIds((current) => (current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId]));
  }

  async function inviteMember() {
    if (inviteValidation) {
      setFormError(inviteValidation);
      return;
    }
    setBusyRef("invite");
    setNotice("");
    setFormError("");
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
      setFormError(apiErrorMessage(result, "Membership invite could not be saved."));
      return;
    }
    setNotice(result.generated_password ? "Invite saved. Temporary password was generated." : "Invite saved.");
    closeInviteDialog();
    router.refresh();
  }

  async function runMembershipAction(membershipId: string, action: "activate" | "suspend" | "revoke" | "update_roles") {
    if (action === "update_roles" && editValidation) {
      setFormError(editValidation);
      return;
    }
    setBusyRef(`${membershipId}:${action}`);
    setNotice("");
    setFormError("");
    const body =
      action === "update_roles"
        ? {
            action,
            role_ids: editRoleIds,
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
      setFormError(apiErrorMessage(result, "Membership action could not be saved."));
      return;
    }
    setNotice(`${actionLabels[action] ?? titleCase(action)} saved.`);
    setEditingMember(null);
    router.refresh();
  }

  return (
    <div className="tenant-membership-actions">
      <div className="tenant-console-panel__header">
        <div>
          <span className="workspace-card__eyebrow">Member mutations</span>
          <h2>User access</h2>
        </div>
        <div className="tenant-membership-actions__header-actions">
          <span className="record-chip">{data.seat_usage.current_value}/{data.seat_usage.limit_value || "unlimited"} seats</span>
          <button className="button button--primary" onClick={() => setInviteOpen(true)} type="button">
            {actionLabels.invite ?? "Invite member"}
          </button>
        </div>
      </div>
      <p className="tenant-console-empty">Invite users and update roles from focused dialogs. Suspended or revoked users lose tenant workspace access.</p>
      {notice ? <span className="tenant-inline-notice" role="status">{notice}</span> : null}

      <div className="tenant-membership-actions__members">
        {data.membership_management.recent_memberships.map((membership) => (
          <div className="tenant-membership-row" key={membership.id}>
            <div>
              <strong>{membership.display_name}</strong>
              <span>{membership.email}</span>
              <span>{membership.roles.map((role) => role.name).join(", ") || "No role"}</span>
            </div>
            <span className="record-chip">{titleCase(membership.membership_status)}</span>
            <div className="tenant-membership-row__actions">
              <button className="button button--secondary" disabled={busyRef.startsWith(`${membership.id}:`)} onClick={() => openEditDialog(membership)} type="button">
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
        ))}
      </div>

      {inviteOpen ? (
        <div className="tenant-modal-shell" role="presentation">
          <div aria-label="Invite tenant member" aria-modal="true" className="tenant-modal" role="dialog">
            <div className="tenant-modal__header">
              <div>
                <span className="workspace-card__eyebrow">User Management</span>
                <h3>Invite member</h3>
              </div>
              <button aria-label="Close invite member" className="button button--ghost" onClick={closeInviteDialog} type="button">
                Close
              </button>
            </div>
            <div className="tenant-membership-form-grid tenant-membership-form-grid--dialog">
              <label>
                <span>Email</span>
                <input aria-invalid={Boolean(formError && formError.toLowerCase().includes("email"))} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@company.com" />
              </label>
              <label>
                <span>Username</span>
                <input aria-invalid={Boolean(formError && formError.toLowerCase().includes("username"))} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="person.name" />
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
            <div className="tenant-role-picker" aria-label="Invite roles">
              {roleOptions.map((role) => (
                <label key={role.id}>
                  <input checked={selectedRoleIds.includes(role.id)} onChange={() => toggleInviteRole(role.id)} type="checkbox" />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
            <div className="tenant-modal__validation">
              <span>{formError || inviteValidation || "Ready to invite after review."}</span>
            </div>
            <div className="tenant-modal__actions">
              <button className="button button--secondary" onClick={closeInviteDialog} type="button">
                Cancel
              </button>
              <button className="button button--primary" disabled={busyRef === "invite" || Boolean(inviteValidation)} onClick={inviteMember} type="button">
                {busyRef === "invite" ? "Saving" : actionLabels.invite ?? "Invite member"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingMember ? (
        <div className="tenant-modal-shell" role="presentation">
          <div aria-label="Update tenant member roles" aria-modal="true" className="tenant-modal tenant-modal--small" role="dialog">
            <div className="tenant-modal__header">
              <div>
                <span className="workspace-card__eyebrow">Role assignment</span>
                <h3>Update roles</h3>
              </div>
              <button aria-label="Close update roles" className="button button--ghost" onClick={() => setEditingMember(null)} type="button">
                Close
              </button>
            </div>
            <div className="tenant-modal__member-summary">
              <strong>{editingMember.display_name}</strong>
              <span>{editingMember.email}</span>
            </div>
            <div className="tenant-role-picker" aria-label="Update roles">
              {roleOptions.map((role) => (
                <label key={role.id}>
                  <input checked={editRoleIds.includes(role.id)} onChange={() => toggleEditRole(role.id)} type="checkbox" />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
            <div className="tenant-modal__validation">
              <span>{formError || editValidation || "Role selection is ready to save."}</span>
            </div>
            <div className="tenant-modal__actions">
              <button className="button button--secondary" onClick={() => setEditingMember(null)} type="button">
                Cancel
              </button>
              <button className="button button--primary" disabled={busyRef.startsWith(`${editingMember.id}:`) || Boolean(editValidation)} onClick={() => runMembershipAction(editingMember.id, "update_roles")} type="button">
                {busyRef === `${editingMember.id}:update_roles` ? "Saving" : actionLabels.update_roles ?? "Update roles"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
