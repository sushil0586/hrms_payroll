import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { getWorkspaceMenuSource, type WorkspaceMenuSource } from "@/lib/ui/menu-catalog";
import { requirePlatformAdminAccess } from "@/lib/workspace-access";

const PLATFORM_ADMIN_NAV_GROUPS = [
  {
    title: "Workspace",
    items: [
      { href: "/platform-admin", label: "Dashboard", shortLabel: "DB", blurb: "Action queue" },
      { href: "/platform-admin/leads", label: "Leads", shortLabel: "LD", blurb: "Signup requests" },
      { href: "/platform-admin/tenants", label: "Tenants", shortLabel: "TN", blurb: "Customer registry" },
      { href: "/platform-admin/onboarding", label: "Launch Readiness", shortLabel: "LR", blurb: "Go-live gates" },
      { href: "/platform-admin/admins", label: "Admin Access", shortLabel: "AA", blurb: "Login access" },
      { href: "/platform-admin/policy-packs", label: "Setup Templates", shortLabel: "ST", blurb: "Default setup" },
      { href: "/platform-admin/permissions", label: "Permissions", shortLabel: "PM", blurb: "RBAC catalog", permissions: ["platform.permission_catalog.manage"] },
      { href: "/platform-admin/audit-logs", label: "Audit Logs", shortLabel: "AU", blurb: "Action evidence" },
    ],
  },
];

const PLATFORM_ADMIN_QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/platform-admin", label: "Dashboard" },
  { href: "/platform-admin/policy-packs", label: "Templates" },
];

const PLATFORM_ADMIN_LABELS: Record<string, { label: string; shortLabel: string; blurb: string }> = {
  "/platform-admin": { label: "Dashboard", shortLabel: "DB", blurb: "Command center" },
  "/platform-admin/leads": { label: "Leads", shortLabel: "LD", blurb: "Signup queue" },
  "/platform-admin/tenants": { label: "Tenants", shortLabel: "TN", blurb: "Customer registry" },
  "/platform-admin/onboarding": { label: "Launch Readiness", shortLabel: "LR", blurb: "Go-live gates" },
  "/platform-admin/admins": { label: "Admin Access", shortLabel: "AA", blurb: "Customer logins" },
  "/platform-admin/policy-packs": { label: "Setup Templates", shortLabel: "ST", blurb: "Baseline setup" },
  "/platform-admin/permissions": { label: "Permissions", shortLabel: "PM", blurb: "RBAC catalog" },
  "/platform-admin/audit-logs": { label: "Audit Logs", shortLabel: "AU", blurb: "Action evidence" },
};

function normalizePlatformMenuSource(menuSource: WorkspaceMenuSource): WorkspaceMenuSource {
  const navGroups = menuSource.navGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      ...(PLATFORM_ADMIN_LABELS[item.href] ?? {}),
    })),
  }));
  return {
    ...menuSource,
    navGroups,
    navItems: navGroups.flatMap((group) => group.items),
    quickLinks: menuSource.quickLinks.map((item) => item.href === "/platform-admin" ? { ...item, label: "Dashboard" } : item),
  };
}

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requirePlatformAdminAccess();
  const userLabel =
    sessionUser.display_name || sessionUser.first_name || sessionUser.username || null;
  const rawMenuSource = await getWorkspaceMenuSource({
    workspace: "platform-admin",
    sessionUser,
    fallbackGroups: PLATFORM_ADMIN_NAV_GROUPS,
    fallbackQuickLinks: PLATFORM_ADMIN_QUICK_LINKS,
  });
  const menuSource = normalizePlatformMenuSource(rawMenuSource);

  return (
    <WorkspaceChrome
      footerDescription="Customer onboarding, setup templates, tenant admin users, and launch-readiness controls."
      navGroups={menuSource.navGroups}
      navItems={menuSource.navItems}
      productLabel="HRMS"
      quickLinks={menuSource.quickLinks}
      roleLabel="Platform Admin"
      searchHint="Search tenants, leads, templates, and launch status"
      userLabel={userLabel}
      workspaceLabel="Platform Control Center"
      workspaceTone="admin"
    >
      {children}
    </WorkspaceChrome>
  );
}
