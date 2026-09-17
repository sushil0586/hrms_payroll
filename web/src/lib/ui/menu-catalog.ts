import type { WorkspaceNavGroup, WorkspaceNavItem } from "@/components/shell/workspace-chrome";
import { getMenuCatalog } from "@/lib/api";
import type { MenuCatalogItem, SessionUser } from "@/lib/types";
import { sessionHasAnyPermission } from "@/lib/workspace-access";

export type WorkspaceMenuSource = {
  navGroups: WorkspaceNavGroup[];
  navItems: WorkspaceNavItem[];
  quickLinks: Array<{ href: string; label: string }>;
  source: "database" | "fallback";
};

export function filterNavGroupsByPermission(sessionUser: SessionUser | null, groups: WorkspaceNavGroup[]) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => sessionHasAnyPermission(sessionUser, item.permissions ?? [])),
    }))
    .filter((group) => group.items.length > 0);
}

export function filterQuickLinksByPermission<T extends { permissions?: string[] }>(sessionUser: SessionUser | null, links: T[]) {
  return links.filter((item) => sessionHasAnyPermission(sessionUser, item.permissions ?? []));
}

function rowsToMenuSource(rows: MenuCatalogItem[], sessionUser: SessionUser | null): WorkspaceMenuSource | null {
  const visibleRows = rows
    .filter((item) => item.is_active && sessionHasAnyPermission(sessionUser, item.permission_keys))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
  const sidebarRows = visibleRows.filter((item) => item.kind === "sidebar");
  if (!sidebarRows.length) return null;
  const groupNames = Array.from(new Set(sidebarRows.map((item) => item.group || "Workspace")));
  const navGroups = groupNames.map((groupName) => ({
    title: groupName,
    items: sidebarRows
      .filter((item) => (item.group || "Workspace") === groupName)
      .map((item) => ({
        href: item.href,
        label: item.label,
        shortLabel: item.short_label || item.label.slice(0, 2).toUpperCase(),
        blurb: item.blurb,
        permissions: item.permission_keys,
      })),
  }));
  const quickLinks = visibleRows
    .filter((item) => item.kind === "quick_link")
    .map((item) => ({ href: item.href, label: item.label }));
  return {
    navGroups,
    navItems: navGroups.flatMap((group) => group.items),
    quickLinks,
    source: "database",
  };
}

export async function getWorkspaceMenuSource({
  workspace,
  sessionUser,
  fallbackGroups,
  fallbackQuickLinks = [],
}: {
  workspace: string;
  sessionUser: SessionUser | null;
  fallbackGroups: WorkspaceNavGroup[];
  fallbackQuickLinks?: Array<{ href: string; label: string; permissions?: string[] }>;
}): Promise<WorkspaceMenuSource> {
  try {
    const result = await getMenuCatalog(workspace);
    const dbSource = rowsToMenuSource(result.data, sessionUser);
    if (dbSource) return dbSource;
  } catch {
    // Keep workspace rendering available during first deploy before menu rows are synced.
  }

  const navGroups = filterNavGroupsByPermission(sessionUser, fallbackGroups);
  const quickLinks = filterQuickLinksByPermission(sessionUser, fallbackQuickLinks).map(({ permissions, ...item }) => item);
  return {
    navGroups,
    navItems: navGroups.flatMap((group) => group.items),
    quickLinks,
    source: "fallback",
  };
}
