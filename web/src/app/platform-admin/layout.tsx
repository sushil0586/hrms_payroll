import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { getWorkspaceMenuSource } from "@/lib/ui/menu-catalog";
import { requirePlatformAdminAccess } from "@/lib/workspace-access";

const PLATFORM_ADMIN_NAV_GROUPS = [
  {
    title: "Workspace",
    items: [
      { href: "/platform-admin", label: "Dashboard", shortLabel: "DB", blurb: "Action queue" },
      { href: "/platform-admin/leads", label: "Leads", shortLabel: "LD", blurb: "Signup requests" },
      { href: "/platform-admin/tenants", label: "Tenants", shortLabel: "TN", blurb: "Customer registry" },
      { href: "/platform-admin/onboarding", label: "Launch Checklist", shortLabel: "LC", blurb: "Readiness gates" },
      { href: "/platform-admin/admins", label: "Tenant Admin Users", shortLabel: "TA", blurb: "Login access" },
      { href: "/platform-admin/policy-packs", label: "Setup Templates", shortLabel: "ST", blurb: "Default setup" },
      { href: "/platform-admin/permissions", label: "Permissions", shortLabel: "PM", blurb: "RBAC catalog", permissions: ["platform.permission_catalog.manage"] },
      { href: "/platform-admin/audit-logs", label: "Audit Logs", shortLabel: "AU", blurb: "Action evidence" },
    ],
  },
];

const PLATFORM_ADMIN_QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/platform-admin", label: "Tenants" },
  { href: "/platform-admin/policy-packs", label: "Templates" },
];

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requirePlatformAdminAccess();
  const userLabel =
    sessionUser.display_name || sessionUser.first_name || sessionUser.username || null;
  const menuSource = await getWorkspaceMenuSource({
    workspace: "platform-admin",
    sessionUser,
    fallbackGroups: PLATFORM_ADMIN_NAV_GROUPS,
    fallbackQuickLinks: PLATFORM_ADMIN_QUICK_LINKS,
  });

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
