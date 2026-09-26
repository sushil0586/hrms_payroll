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

  const roleCodes = new Set(user.default_membership?.role_codes ?? []);
  if (user.workspace_access?.platform_admin) return "/platform-admin";
  if (roleCodes.has("tenant-admin") && !roleCodes.has("hr-admin")) return "/tenant-admin";
  if (user.workspace_access?.hr_admin) return "/hr-admin";
  if (user.workspace_access?.tenant_admin) return "/tenant-admin";
  if (user.workspace_access?.mss) return "/mss/approvals";
  if (user.workspace_access?.ess) return "/ess";
  return null;
}
