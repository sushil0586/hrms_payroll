"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { TenantAdminConsole } from "@/lib/types";

type RoleItem = TenantAdminConsole["role_management"]["roles"][number];
type PermissionItem = TenantAdminConsole["role_management"]["permission_catalog"][number];
type RoleDialogMode = "create" | "edit";

function apiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail) return detail;
    return JSON.stringify(payload);
  }
  return fallback;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function splitPermissionKeys(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function riskLabel(value: string) {
  return `${titleCase(value)} risk`;
}

export function TenantRoleActions({ canManageRoles, data }: { canManageRoles: boolean; data: TenantAdminConsole }) {
  const router = useRouter();
  const roles = data.role_management.roles;
  const permissionCatalog = data.role_management.permission_catalog.filter((item) => item.tenant_assignable);
  const permissionLabelByKey = useMemo(() => new Map(permissionCatalog.map((item) => [item.key, item.label])), [permissionCatalog]);
  const permissionByKey = useMemo(() => new Map(permissionCatalog.map((item) => [item.key, item])), [permissionCatalog]);
  const [query, setQuery] = useState("");
  const [dialogMode, setDialogMode] = useState<RoleDialogMode | null>(null);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [permissionKeys, setPermissionKeys] = useState("");
  const [permissionModule, setPermissionModule] = useState("All");
  const [isActive, setIsActive] = useState(true);
  const [busyRef, setBusyRef] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const filteredRoles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return roles;
    return roles.filter((role) =>
      [role.name, role.code, role.description, role.is_active ? "active" : "inactive", role.is_system_role ? "system" : "custom", role.permission_keys.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query, roles]);

  const selectedPermissionKeys = useMemo(() => splitPermissionKeys(permissionKeys), [permissionKeys]);
  const selectedPermissionKeySet = useMemo(() => new Set(selectedPermissionKeys), [selectedPermissionKeys]);
  const permissionModules = useMemo(() => ["All", ...Array.from(new Set(permissionCatalog.map((item) => item.module))).sort()], [permissionCatalog]);
  const visiblePermissionCatalog = useMemo(() => {
    if (permissionModule === "All") return permissionCatalog;
    return permissionCatalog.filter((item) => item.module === permissionModule);
  }, [permissionCatalog, permissionModule]);
  const visiblePermissionGroups = useMemo(() => {
    return visiblePermissionCatalog.reduce<Array<{ module: string; permissions: PermissionItem[] }>>((groups, permission) => {
      const existing = groups.find((group) => group.module === permission.module);
      if (existing) {
        existing.permissions.push(permission);
      } else {
        groups.push({ module: permission.module, permissions: [permission] });
      }
      return groups;
    }, []);
  }, [visiblePermissionCatalog]);
  const selectedPermissionLabels = useMemo(
    () => selectedPermissionKeys.map((key) => permissionByKey.get(key)?.label ?? key),
    [permissionByKey, selectedPermissionKeys]
  );
  const permissionOverviewGroups = useMemo(() => {
    return permissionCatalog.reduce<Array<{ module: string; permissions: PermissionItem[] }>>((groups, permission) => {
      const existing = groups.find((group) => group.module === permission.module);
      if (existing) {
        existing.permissions.push(permission);
      } else {
        groups.push({ module: permission.module, permissions: [permission] });
      }
      return groups;
    }, []);
  }, [permissionCatalog]);

  function togglePermissionKey(permissionKey: string) {
    const permission = permissionByKey.get(permissionKey);
    if (permission && !permission.is_available && !selectedPermissionKeySet.has(permissionKey)) return;
    const nextKeys = new Set(selectedPermissionKeys);
    if (nextKeys.has(permissionKey)) {
      nextKeys.delete(permissionKey);
    } else {
      nextKeys.add(permissionKey);
    }
    setPermissionKeys(Array.from(nextKeys).sort().join("\n"));
  }

  const validation = useMemo(() => {
    if (!name.trim()) return "Role name is required.";
    if (!slugify(code || name)) return "Role code is required.";
    return "";
  }, [code, name]);

  const closeDialog = useCallback(() => {
    setDialogMode(null);
    setEditingRole(null);
    setName("");
    setCode("");
    setDescription("");
    setPermissionKeys("");
    setPermissionModule("All");
    setIsActive(true);
    setFormError("");
  }, []);

  function openCreateDialog() {
    if (!canManageRoles) {
      setNotice("You need tenant.roles.manage to create tenant roles.");
      return;
    }
    setDialogMode("create");
    setEditingRole(null);
    setName("");
    setCode("");
    setDescription("");
    setPermissionKeys("");
    setPermissionModule("All");
    setIsActive(true);
    setNotice("");
    setFormError("");
  }

  function openEditDialog(role: RoleItem) {
    if (!canManageRoles) {
      setNotice("You need tenant.roles.manage to update tenant roles.");
      return;
    }
    setDialogMode("edit");
    setEditingRole(role);
    setName(role.name);
    setCode(role.code);
    setDescription(role.description);
    setPermissionKeys(role.permission_keys.join("\n"));
    const firstPermission = role.permission_keys.map((key) => permissionByKey.get(key)).find(Boolean);
    setPermissionModule(firstPermission?.module ?? "All");
    setIsActive(role.is_active);
    setNotice("");
    setFormError("");
  }

  useEffect(() => {
    if (dialogMode) nameRef.current?.focus();
  }, [dialogMode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dialogMode) closeDialog();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeDialog, dialogMode]);

  async function saveRole() {
    if (!canManageRoles) {
      setFormError("You need tenant.roles.manage to save tenant roles.");
      return;
    }
    if (validation) {
      setFormError(validation);
      return;
    }
    const roleCode = slugify(code || name);
    const body = {
      name: name.trim(),
      code: roleCode,
      description: description.trim(),
      is_active: isActive,
      permission_keys: selectedPermissionKeys,
    };
    const target = dialogMode === "edit" && editingRole ? `/api/tenant-admin/roles/${editingRole.id}` : "/api/tenant-admin/roles";
    setBusyRef(dialogMode ?? "role");
    setFormError("");
    setNotice("");
    const response = await fetch(target, {
      method: dialogMode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setBusyRef("");
    if (!response.ok) {
      setFormError(apiErrorMessage(result, "Role could not be saved."));
      return;
    }
    setNotice(dialogMode === "edit" ? "Role updated." : "Role created.");
    closeDialog();
    router.refresh();
  }

  async function runStatusAction(role: RoleItem, action: "activate" | "deactivate") {
    if (!canManageRoles) {
      setNotice("You need tenant.roles.manage to change role status.");
      return;
    }
    setBusyRef(`${role.id}:${action}`);
    setFormError("");
    setNotice("");
    const response = await fetch(`/api/tenant-admin/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const result = await response.json().catch(() => ({}));
    setBusyRef("");
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Role status could not be changed."));
      return;
    }
    setNotice(action === "activate" ? "Role activated." : "Role deactivated.");
    router.refresh();
  }

  return (
    <div className="tenant-role-actions">
      <div className="tenant-console-panel__header">
        <div>
          <span className="workspace-card__eyebrow">Roles & Permissions</span>
          <h2>Access model</h2>
        </div>
        <button className="button button--primary" disabled={!canManageRoles} onClick={openCreateDialog} title={!canManageRoles ? "Requires tenant.roles.manage" : undefined} type="button">
          Add role
        </button>
      </div>
      <p className="tenant-console-empty">System roles stay protected. Custom roles can be created, edited, activated, deactivated, and assigned from the Users page.</p>
      {!canManageRoles ? <span className="tenant-inline-notice tenant-inline-notice--muted" role="status">You can view tenant roles. Role changes require tenant.roles.manage.</span> : null}
      {notice ? <span className="tenant-inline-notice" role="status">{notice}</span> : null}
      <div className="tenant-membership-toolbar">
        <label>
          <span>Search roles</span>
          <input aria-label="Search roles" onChange={(event) => setQuery(event.target.value)} placeholder="Role, code, permission, status" value={query} />
        </label>
        <span className="record-chip">{filteredRoles.length} roles</span>
      </div>
      <div className="tenant-role-workspace">
        <div className="tenant-role-list" aria-label="Tenant roles">
          {filteredRoles.map((role) => {
            const canDeactivate = !role.is_system_role && role.is_active && role.active_membership_count === 0;
            const disableReason = role.is_system_role
              ? "System role is protected."
              : role.active_membership_count > 0
                ? "Remove assigned members before deactivation."
                : role.is_active
                  ? ""
                  : "Inactive role can be reactivated.";
            return (
              <div className="tenant-role-row" key={role.id}>
                <div className="tenant-role-row__main">
                  <strong>{role.name}</strong>
                  <span>{role.code}</span>
                  <p>{role.description || "No description set."}</p>
                  <div className="tenant-role-row__chips">
                    <span className="record-chip">{role.is_system_role ? "System" : "Custom"}</span>
                    <span className="record-chip">{role.is_active ? "Active" : "Inactive"}</span>
                    <span className="record-chip">{role.active_membership_count} assigned</span>
                    <span className="record-chip">{role.permission_keys.length} permissions</span>
                  </div>
                </div>
                <div className="tenant-role-row__permissions">
                  <span>
                    {role.permission_keys.length
                      ? role.permission_keys.map((key) => permissionLabelByKey.get(key) ?? key).join(", ")
                      : "No permission keys yet"}
                  </span>
                </div>
                <div className="tenant-role-row__actions">
                  <button className="button button--secondary" disabled={!canManageRoles || busyRef.startsWith(role.id)} onClick={() => openEditDialog(role)} title={!canManageRoles ? "Requires tenant.roles.manage" : undefined} type="button">
                    Edit
                  </button>
                  {role.is_active ? (
                    <button className="button button--ghost" disabled={!canManageRoles || !canDeactivate || busyRef === `${role.id}:deactivate`} onClick={() => runStatusAction(role, "deactivate")} title={!canManageRoles ? "Requires tenant.roles.manage" : disableReason} type="button">
                      Deactivate
                    </button>
                  ) : (
                    <button className="button button--secondary" disabled={!canManageRoles || busyRef === `${role.id}:activate`} onClick={() => runStatusAction(role, "activate")} title={!canManageRoles ? "Requires tenant.roles.manage" : undefined} type="button">
                      Activate
                    </button>
                  )}
                  {disableReason ? <small>{disableReason}</small> : null}
                </div>
              </div>
            );
          })}
          {!filteredRoles.length ? (
            <div className="tenant-console-empty" role="status">
              No roles match the current search.
            </div>
          ) : null}
        </div>
        <aside className="tenant-permission-overview" aria-label="Permission catalog overview">
          <div className="tenant-permission-overview__header">
            <div>
              <span className="workspace-card__eyebrow">Permission Matrix</span>
              <h3>Assignable permissions</h3>
            </div>
            <span className="record-chip">{permissionCatalog.length} permissions</span>
          </div>
          <p className="tenant-console-empty">Use Edit on a role to change its exact permission set. Risk badges help keep access intentional.</p>
          <div className="tenant-permission-overview__groups">
            {permissionOverviewGroups.map((group) => (
              <section className="tenant-permission-overview__group" key={group.module}>
                <div>
                  <strong>{group.module}</strong>
                  <span>{group.permissions.length} permissions</span>
                </div>
                <ul>
                  {group.permissions.slice(0, 4).map((permission) => (
                    <li key={permission.key}>
                      <span>{permission.label}</span>
                      <small className={`tenant-permission-risk tenant-permission-risk--${permission.risk_level}`}>{riskLabel(permission.risk_level)}</small>
                    </li>
                  ))}
                </ul>
                {group.permissions.length > 4 ? <small>{group.permissions.length - 4} more in this module</small> : null}
              </section>
            ))}
          </div>
        </aside>
      </div>

      {dialogMode ? (
        <div className="tenant-modal-shell" role="presentation">
          <div aria-describedby="role-dialog-validation" aria-label={dialogMode === "edit" ? "Update tenant role" : "Create tenant role"} aria-modal="true" className="tenant-modal" role="dialog">
            <div className="tenant-modal__header">
              <div>
                <span className="workspace-card__eyebrow">{dialogMode === "edit" ? "Role setup" : "New role"}</span>
                <h3>{dialogMode === "edit" ? "Update role" : "Create role"}</h3>
              </div>
              <button aria-label="Close role dialog" className="button button--ghost" onClick={closeDialog} type="button">
                Close
              </button>
            </div>
            <div className="tenant-membership-form-grid tenant-membership-form-grid--dialog">
              <label>
                <span>Role name</span>
                <input aria-describedby="role-dialog-validation" aria-invalid={Boolean(formError || validation)} onChange={(event) => setName(event.target.value)} placeholder="Leave Approver" ref={nameRef} value={name} />
              </label>
              <label>
                <span>Role code</span>
                <input disabled={Boolean(editingRole?.is_system_role)} onChange={(event) => setCode(event.target.value)} placeholder="leave-approver" value={code} />
              </label>
            </div>
            <label className="tenant-modal__note">
              <span>Description</span>
              <textarea onChange={(event) => setDescription(event.target.value)} placeholder="What this role is responsible for" value={description} />
            </label>
            <div className="tenant-modal__note">
              <span>Permissions</span>
              <div className="tenant-permission-matrix">
                <div className="tenant-permission-summary">
                  <strong>{selectedPermissionKeys.length} selected</strong>
                  <span>{selectedPermissionLabels.length ? selectedPermissionLabels.join(", ") : "Select only the actions this role should perform."}</span>
                </div>
                <div className="tenant-permission-tabs" role="tablist" aria-label="Permission modules">
                  {permissionModules.map((module) => (
                    <button
                      aria-selected={permissionModule === module}
                      className={permissionModule === module ? "is-active" : ""}
                      key={module}
                      onClick={() => setPermissionModule(module)}
                      role="tab"
                      type="button"
                    >
                      {module}
                    </button>
                  ))}
                </div>
                <div className="tenant-permission-catalog" role="group" aria-label="Assignable permissions">
                  {visiblePermissionGroups.map((group) => (
                    <section className="tenant-permission-group" key={group.module}>
                      <div className="tenant-permission-group__header">
                        <strong>{group.module}</strong>
                        <span>{group.permissions.filter((permission) => selectedPermissionKeySet.has(permission.key)).length} of {group.permissions.length} selected</span>
                      </div>
                      {group.permissions.map((permission) => (
                        <label className={`tenant-permission-option${permission.is_available ? "" : " is-unavailable"}`} key={permission.key}>
                          <input
                            checked={selectedPermissionKeySet.has(permission.key)}
                            disabled={!permission.is_available && !selectedPermissionKeySet.has(permission.key)}
                            onChange={() => togglePermissionKey(permission.key)}
                            type="checkbox"
                          />
                          <span>
                            <strong>{permission.label}</strong>
                            <small>{permission.is_available ? permission.description : permission.unavailable_reason || permission.description}</small>
                            <small>
                              <span className={`tenant-permission-risk tenant-permission-risk--${permission.risk_level}`}>{riskLabel(permission.risk_level)}</span>
                              {permission.is_available ? (permission.required_entitlement ? `Available with ${permission.required_entitlement.replaceAll("_", " ")}` : "Core permission") : "Unavailable for this plan"}
                            </small>
                          </span>
                        </label>
                      ))}
                    </section>
                  ))}
                  {!permissionCatalog.length ? <span className="tenant-console-empty">No tenant-assignable permissions are available.</span> : null}
                  {permissionCatalog.length && !visiblePermissionGroups.length ? <span className="tenant-console-empty">No permissions found for this module.</span> : null}
                </div>
              </div>
            </div>
            <label className="tenant-role-active-toggle">
              <input checked={isActive} disabled={Boolean(editingRole?.is_system_role)} onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />
              <span>{isActive ? "Role is active" : "Role is inactive"}</span>
            </label>
            <div className="tenant-modal__validation" id="role-dialog-validation" role={formError || validation ? "alert" : "status"}>
              <span>{formError || validation || (editingRole?.is_system_role ? "System role name and permissions can be documented; code and active state are protected." : "Role is ready to save.")}</span>
            </div>
            <div className="tenant-modal__actions">
              <button className="button button--secondary" onClick={closeDialog} type="button">
                Cancel
              </button>
              <button className="button button--primary" disabled={Boolean(validation) || Boolean(busyRef)} onClick={saveRole} type="button">
                {busyRef ? "Saving" : dialogMode === "edit" ? "Update role" : "Create role"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
