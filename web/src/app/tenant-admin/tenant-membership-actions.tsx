"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  canManageUsers: boolean;
  data: TenantAdminConsole;
};

type TenantMembership = TenantAdminConsole["membership_management"]["recent_memberships"][number];
type EditingMember = TenantMembership | null;
type Confirmation = {
  member: NonNullable<EditingMember>;
  action: "activate" | "suspend" | "revoke";
} | null;

const PAGE_SIZE = 8;

export function TenantMembershipActions({ canManageUsers, data }: Props) {
  const router = useRouter();
  const roleOptions = data.membership_management.role_options;
  const activeStatusOptions = useMemo(
    () => data.membership_management.status_options.filter((item) => item.value === "invited" || item.value === "active"),
    [data.membership_management.status_options]
  );
  const defaultRoleId = roleOptions[0]?.id ?? "";
  const memberships = data.membership_management.memberships?.length ? data.membership_management.memberships : data.membership_management.recent_memberships;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<EditingMember>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [membershipStatus, setMembershipStatus] = useState(activeStatusOptions[0]?.value ?? "invited");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(defaultRoleId ? [defaultRoleId] : []);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [actionNote, setActionNote] = useState("");
  const [busyRef, setBusyRef] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const inviteEmailRef = useRef<HTMLInputElement>(null);
  const editDialogRef = useRef<HTMLDivElement>(null);
  const confirmationNoteRef = useRef<HTMLTextAreaElement>(null);

  const actionLabels = useMemo(
    () => Object.fromEntries(data.membership_management.available_actions.map((action) => [action.value, action.label])),
    [data.membership_management.available_actions]
  );

  const filteredMemberships = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return memberships;
    return memberships.filter((membership) => {
      const haystack = [
        membership.display_name,
        membership.email,
        membership.username,
        membership.membership_status,
        membership.roles.map((role) => role.name).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [memberSearch, memberships]);

  const pageCount = Math.max(1, Math.ceil(filteredMemberships.length / PAGE_SIZE));
  const boundedPageIndex = Math.min(pageIndex, pageCount - 1);
  const pagedMemberships = filteredMemberships.slice(boundedPageIndex * PAGE_SIZE, boundedPageIndex * PAGE_SIZE + PAGE_SIZE);
  const firstVisibleRow = filteredMemberships.length ? boundedPageIndex * PAGE_SIZE + 1 : 0;
  const lastVisibleRow = Math.min(filteredMemberships.length, (boundedPageIndex + 1) * PAGE_SIZE);

  const inviteValidation = useMemo(() => {
    if (!email.trim()) return "Email is required.";
    if (!emailLooksValid(email.trim())) return "Enter a valid work email address.";
    if (!username.trim()) return "Username is required.";
    if (!selectedRoleIds.length) return "Select at least one role.";
    return "";
  }, [email, selectedRoleIds.length, username]);

  const editValidation = editRoleIds.length ? "" : "Select at least one role before saving.";
  const normalizedInviteValidation = inviteValidation.toLowerCase();
  const inviteEmailInvalid = normalizedInviteValidation.includes("email") || (email.trim() ? !emailLooksValid(email.trim()) : false);
  const inviteUsernameInvalid = normalizedInviteValidation.includes("username");

  const resetInviteForm = useCallback(() => {
    setEmail("");
    setUsername("");
    setFirstName("");
    setLastName("");
    setMembershipStatus(activeStatusOptions[0]?.value ?? "invited");
    setSelectedRoleIds(defaultRoleId ? [defaultRoleId] : []);
    setFormError("");
  }, [activeStatusOptions, defaultRoleId]);

  const closeInviteDialog = useCallback(() => {
    setInviteOpen(false);
    resetInviteForm();
  }, [resetInviteForm]);

  function openEditDialog(member: NonNullable<EditingMember>) {
    setEditingMember(member);
    setEditRoleIds(member.role_ids.length ? member.role_ids : defaultRoleId ? [defaultRoleId] : []);
    setFormError("");
    setNotice("");
  }

  function openConfirmation(member: NonNullable<EditingMember>, action: NonNullable<Confirmation>["action"]) {
    setConfirmation({ member, action });
    setActionNote("");
    setFormError("");
    setNotice("");
  }

  const closeConfirmation = useCallback(() => {
    setConfirmation(null);
    setActionNote("");
    setFormError("");
  }, []);

  useEffect(() => {
    if (inviteOpen) {
      inviteEmailRef.current?.focus();
    }
  }, [inviteOpen]);

  useEffect(() => {
    if (editingMember) {
      editDialogRef.current?.querySelector<HTMLInputElement>("input[type='checkbox']")?.focus();
    }
  }, [editingMember]);

  useEffect(() => {
    if (confirmation) {
      confirmationNoteRef.current?.focus();
    }
  }, [confirmation]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (inviteOpen) closeInviteDialog();
      if (editingMember) setEditingMember(null);
      if (confirmation) closeConfirmation();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeConfirmation, closeInviteDialog, confirmation, editingMember, inviteOpen]);

  function toggleInviteRole(roleId: string) {
    setSelectedRoleIds((current) => (current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId]));
  }

  function toggleEditRole(roleId: string) {
    setEditRoleIds((current) => (current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId]));
  }

  function updateMemberSearch(value: string) {
    setMemberSearch(value);
    setPageIndex(0);
  }

  async function inviteMember() {
    if (!canManageUsers) {
      setFormError("You need tenant.users.manage to invite tenant users.");
      return;
    }
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

  async function runMembershipAction(membershipId: string, action: "activate" | "suspend" | "revoke" | "update_roles", note = "") {
    if (!canManageUsers) {
      setFormError("You need tenant.users.manage to update tenant users.");
      return;
    }
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
            note,
          }
        : { action, note };
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
    closeConfirmation();
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
          <button className="button button--primary" disabled={!canManageUsers} onClick={() => setInviteOpen(true)} title={!canManageUsers ? "Requires tenant.users.manage" : undefined} type="button">
            {actionLabels.invite ?? "Invite member"}
          </button>
        </div>
      </div>
      <p className="tenant-console-empty">Invite users and update roles from focused dialogs. Suspended or revoked users lose tenant workspace access.</p>
      {!canManageUsers ? <span className="tenant-inline-notice tenant-inline-notice--muted" role="status">You can view tenant users. User changes require tenant.users.manage.</span> : null}
      {notice ? <span className="tenant-inline-notice" role="status">{notice}</span> : null}

      <div className="tenant-membership-toolbar">
        <label>
          <span>Search members</span>
          <input aria-label="Search members" onChange={(event) => updateMemberSearch(event.target.value)} placeholder="Name, email, username, status, or role" value={memberSearch} />
        </label>
        <div aria-label="Member pagination" className="tenant-membership-pager">
          <span>
            {firstVisibleRow}-{lastVisibleRow} of {filteredMemberships.length}
          </span>
          <button className="button button--secondary button--compact" disabled={boundedPageIndex === 0} onClick={() => setPageIndex((current) => Math.max(0, current - 1))} type="button">
            Previous
          </button>
          <button className="button button--secondary button--compact" disabled={boundedPageIndex >= pageCount - 1} onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))} type="button">
            Next
          </button>
        </div>
      </div>

      <div className="tenant-membership-actions__members">
        {pagedMemberships.map((membership) => (
          <div className="tenant-membership-row" key={membership.id}>
            <div>
              <strong>{membership.display_name}</strong>
              <span>{membership.email}</span>
              <span>{membership.roles.map((role) => role.name).join(", ") || "No role"}</span>
            </div>
            <span className="record-chip">{titleCase(membership.membership_status)}</span>
            <div className="tenant-membership-row__actions">
              <button className="button button--secondary" disabled={!canManageUsers || busyRef.startsWith(`${membership.id}:`)} onClick={() => openEditDialog(membership)} title={!canManageUsers ? "Requires tenant.users.manage" : undefined} type="button">
                {actionLabels.update_roles ?? "Update roles"}
              </button>
              {membership.membership_status === "active" ? (
                <button className="button button--secondary" disabled={!canManageUsers || busyRef.startsWith(`${membership.id}:`)} onClick={() => openConfirmation(membership, "suspend")} title={!canManageUsers ? "Requires tenant.users.manage" : undefined} type="button">
                  {actionLabels.suspend ?? "Suspend"}
                </button>
              ) : (
                <button className="button button--secondary" disabled={!canManageUsers || busyRef.startsWith(`${membership.id}:`)} onClick={() => openConfirmation(membership, "activate")} title={!canManageUsers ? "Requires tenant.users.manage" : undefined} type="button">
                  {actionLabels.activate ?? "Activate"}
                </button>
              )}
              <button className="button button--ghost" disabled={!canManageUsers || busyRef.startsWith(`${membership.id}:`)} onClick={() => openConfirmation(membership, "revoke")} title={!canManageUsers ? "Requires tenant.users.manage" : undefined} type="button">
                {actionLabels.revoke ?? "Revoke"}
              </button>
            </div>
          </div>
        ))}
        {!pagedMemberships.length ? (
          <div className="tenant-console-empty" role="status">
            No members match the current search.
          </div>
        ) : null}
      </div>

      {inviteOpen ? (
        <div className="tenant-modal-shell" role="presentation">
          <div aria-describedby="invite-member-validation" aria-label="Invite tenant member" aria-modal="true" className="tenant-modal" role="dialog">
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
                <input aria-describedby="invite-member-validation" aria-invalid={inviteEmailInvalid || Boolean(formError && formError.toLowerCase().includes("email"))} ref={inviteEmailRef} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@company.com" />
              </label>
              <label>
                <span>Username</span>
                <input aria-describedby="invite-member-validation" aria-invalid={inviteUsernameInvalid || Boolean(formError && formError.toLowerCase().includes("username"))} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="person.name" />
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
            <div className="tenant-role-picker" aria-describedby="invite-member-validation" aria-label="Invite roles">
              {roleOptions.map((role) => (
                <label key={role.id}>
                  <input checked={selectedRoleIds.includes(role.id)} onChange={() => toggleInviteRole(role.id)} type="checkbox" />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
            <div className="tenant-modal__validation" id="invite-member-validation" role={formError || inviteValidation ? "alert" : "status"}>
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
          <div aria-describedby="update-member-validation" aria-label="Update tenant member roles" aria-modal="true" className="tenant-modal tenant-modal--small" ref={editDialogRef} role="dialog">
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
            <div className="tenant-role-picker" aria-describedby="update-member-validation" aria-label="Update roles">
              {roleOptions.map((role) => (
                <label key={role.id}>
                  <input checked={editRoleIds.includes(role.id)} onChange={() => toggleEditRole(role.id)} type="checkbox" />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
            <div className="tenant-modal__validation" id="update-member-validation" role={formError || editValidation ? "alert" : "status"}>
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

      {confirmation ? (
        <div className="tenant-modal-shell" role="presentation">
          <div aria-describedby="membership-action-validation" aria-label={`${titleCase(confirmation.action)} tenant member`} aria-modal="true" className="tenant-modal tenant-modal--small" role="dialog">
            <div className="tenant-modal__header">
              <div>
                <span className="workspace-card__eyebrow">Access change</span>
                <h3>{titleCase(confirmation.action)} member</h3>
              </div>
              <button aria-label={`Close ${confirmation.action} member`} className="button button--ghost" onClick={closeConfirmation} type="button">
                Close
              </button>
            </div>
            <div className="tenant-modal__member-summary">
              <strong>{confirmation.member.display_name}</strong>
              <span>{confirmation.member.email}</span>
              <span>Current status: {titleCase(confirmation.member.membership_status)}</span>
            </div>
            <label className="tenant-modal__note">
              <span>Change note</span>
              <textarea
                aria-label="Change note"
                aria-describedby="membership-action-validation"
                onChange={(event) => setActionNote(event.target.value)}
                placeholder="Reason or approval reference"
                ref={confirmationNoteRef}
                value={actionNote}
              />
            </label>
            <div className="tenant-modal__validation" id="membership-action-validation" role="status">
              <span>
                {confirmation.action === "revoke"
                  ? "Revoked members lose access and remain visible in audit history."
                  : confirmation.action === "suspend"
                    ? "Suspended members lose access until reactivated."
                    : "Activated members can access the tenant workspace when role and seat rules allow it."}
              </span>
            </div>
            <div className="tenant-modal__actions">
              <button className="button button--secondary" onClick={closeConfirmation} type="button">
                Cancel
              </button>
              <button
                className={confirmation.action === "revoke" ? "button button--danger" : "button button--primary"}
                disabled={busyRef.startsWith(`${confirmation.member.id}:`)}
                onClick={() => runMembershipAction(confirmation.member.id, confirmation.action, actionNote.trim())}
                type="button"
              >
                {busyRef === `${confirmation.member.id}:${confirmation.action}` ? "Saving" : actionLabels[confirmation.action] ?? titleCase(confirmation.action)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
