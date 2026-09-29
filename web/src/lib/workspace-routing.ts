type WorkspaceRouteUser = {
  default_membership?: {
    role_codes?: string[];
  } | null;
  workspace_access?: {
    platform_admin?: boolean;
    hr_admin?: boolean;
    tenant_admin?: boolean;
    mss?: boolean;
    ess?: boolean;
  };
};

export function getPrimaryWorkspaceHref(user: WorkspaceRouteUser | null | undefined) {
  if (!user) {
    return null;
  }

  const orderedRoleCodes = user.default_membership?.role_codes ?? [];
  const primaryRoleCode = orderedRoleCodes[0] ?? "";
  const roleCodes = new Set(orderedRoleCodes);
  if (user.workspace_access?.platform_admin) return "/platform-admin";
  if (primaryRoleCode === "tenant-admin" || (roleCodes.has("tenant-admin") && !roleCodes.has("hr-admin"))) {
    return "/tenant-admin";
  }
  if (primaryRoleCode === "payroll-finance-manager") return "/finance-manager";
  if (primaryRoleCode === "manager" && user.workspace_access?.mss) return "/mss/approvals";
  if (primaryRoleCode === "employee" && user.workspace_access?.ess) return "/ess";
  if (roleCodes.has("hr-admin") && user.workspace_access?.hr_admin) return "/hr-admin";
  if (user.workspace_access?.tenant_admin) return "/tenant-admin";
  if (roleCodes.has("payroll-finance-manager")) return "/finance-manager";
  if (user.workspace_access?.mss) return "/mss/approvals";
  if (user.workspace_access?.ess) return "/ess";
  return null;
}
