import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/api";
import { API_BASE_URL, DEMO_DATA_ENABLED } from "@/lib/runtime-flags";
import type { SessionMembership, SessionUser } from "@/lib/types";

function getDefaultMembership(sessionUser: SessionUser | null) {
  return sessionUser?.default_membership ?? null;
}

export function membershipHasAnyRole(
  membership: SessionMembership | null | undefined,
  roleCodes: string[],
) {
  if (!membership) {
    return false;
  }

  return roleCodes.some((roleCode) => membership.role_codes.includes(roleCode));
}

export function sessionHasAnyRole(sessionUser: SessionUser | null, roleCodes: string[]) {
  return membershipHasAnyRole(getDefaultMembership(sessionUser), roleCodes);
}

export function sessionCanAccessWorkspace(
  sessionUser: SessionUser | null,
  workspace: keyof SessionUser["workspace_access"],
) {
  return Boolean(sessionUser?.workspace_access?.[workspace]);
}

type RequireWorkspaceAccessOptions = {
  roleCodes?: string[];
  workspace?: keyof SessionUser["workspace_access"];
  loginPath?: string;
  fallbackPath?: string;
};

export async function requireWorkspaceAccess({
  roleCodes = [],
  workspace,
  loginPath = "/login",
  fallbackPath = "/",
}: RequireWorkspaceAccessOptions = {}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser && DEMO_DATA_ENABLED && !API_BASE_URL) {
    return null;
  }

  if (!sessionUser) {
    redirect(loginPath);
  }

  if (workspace && !sessionCanAccessWorkspace(sessionUser, workspace)) {
    redirect(fallbackPath);
  }

  if (roleCodes.length && !sessionHasAnyRole(sessionUser, roleCodes)) {
    redirect(fallbackPath);
  }

  return sessionUser;
}

export async function requirePlatformAdminAccess({
  loginPath = "/login",
  fallbackPath = "/",
}: {
  loginPath?: string;
  fallbackPath?: string;
} = {}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(loginPath);
  }

  if (!sessionUser.workspace_access.platform_admin) {
    redirect(fallbackPath);
  }

  return sessionUser;
}
