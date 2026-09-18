import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { getWorkspaceMenuSource } from "@/lib/ui/menu-catalog";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const TENANT_ADMIN_NAV_ITEMS = [
  { href: "/tenant-admin", label: "Dashboard", shortLabel: "DB", blurb: "Tenant overview", permissions: ["tenant.dashboard.view"] },
  { href: "/tenant-admin/users", label: "Users", shortLabel: "US", blurb: "Manage users", permissions: ["tenant.users.view", "tenant.users.manage"] },
  { href: "/tenant-admin/roles", label: "Roles & Permissions", shortLabel: "RP", blurb: "Roles and access", permissions: ["tenant.roles.view", "tenant.roles.manage"] },
  { href: "/tenant-admin/plan", label: "Plan & Billing", shortLabel: "PB", blurb: "Subscription details", permissions: ["tenant.plan.view"] },
  { href: "/tenant-admin/setup", label: "Setup Guide", shortLabel: "SG", blurb: "Launch steps", permissions: ["tenant.setup.view"] },
  { href: "/tenant-admin/settings", label: "Settings", shortLabel: "ST", blurb: "Tenant configuration", permissions: ["tenant.settings.view"] },
  { href: "/tenant-admin/security-readiness", label: "Security", shortLabel: "SE", blurb: "Access and policies", permissions: ["tenant.security.view"] },
  { href: "/tenant-admin/support-access", label: "Support Access", shortLabel: "SA", blurb: "Assisted operations", permissions: ["tenant.support_access.request", "tenant.support_access.approve"] },
  { href: "/tenant-admin/trust-audit", label: "Audit Trail", shortLabel: "AT", blurb: "Activity logs", permissions: ["tenant.audit.view", "tenant.audit.export"] },
];

const TENANT_ADMIN_NAV_GROUPS = [
  {
    title: "Overview",
    items: TENANT_ADMIN_NAV_ITEMS.slice(0, 3),
  },
  {
    title: "Subscription",
    items: TENANT_ADMIN_NAV_ITEMS.slice(3, 4),
  },
  {
    title: "Tenant Setup",
    items: TENANT_ADMIN_NAV_ITEMS.slice(4, 6),
  },
  {
    title: "Security & Governance",
    items: TENANT_ADMIN_NAV_ITEMS.slice(6),
  },
];

const TENANT_ADMIN_QUICK_LINKS = [
  { href: "/", label: "Home", permissions: [] },
  { href: "/tenant-admin", label: "Tenant", permissions: ["tenant.dashboard.view"] },
  { href: "/tenant-admin/setup", label: "Setup guide", permissions: ["tenant.setup.view"] },
  { href: "/tenant-admin/trust-audit", label: "Trust audit", permissions: ["tenant.audit.view", "tenant.audit.export"] },
  { href: "/tenant-admin/security-readiness", label: "Security", permissions: ["tenant.security.view"] },
];

export default async function TenantAdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireWorkspaceAccess({ workspace: "tenant_admin" });
  const userLabel =
    sessionUser?.display_name || sessionUser?.first_name || sessionUser?.username || null;
  const menuSource = await getWorkspaceMenuSource({
    workspace: "tenant-admin",
    sessionUser,
    fallbackGroups: TENANT_ADMIN_NAV_GROUPS,
    fallbackQuickLinks: TENANT_ADMIN_QUICK_LINKS,
  });

  return (
    <WorkspaceChrome
      footerDescription="Account setup, users, plan, support, security, and audit evidence in one focused workspace."
      navGroups={menuSource.navGroups}
      navItems={menuSource.navItems}
      productLabel="HRMS"
      quickLinks={menuSource.quickLinks}
      roleLabel="Tenant Admin"
      searchHint="Search users, setup, audit..."
      userLabel={userLabel}
      workspaceLabel="Account Control Center"
      workspaceTone="tenant"
    >
      {children}
    </WorkspaceChrome>
  );
}
