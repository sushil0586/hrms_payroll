import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { requireWorkspaceAccess, sessionHasAnyPermission } from "@/lib/workspace-access";

const TENANT_ADMIN_NAV_ITEMS = [
  { href: "/tenant-admin", label: "Dashboard", shortLabel: "DB", blurb: "Account posture", permissions: ["tenant.dashboard.view"] },
  { href: "/tenant-admin/users", label: "Users", shortLabel: "US", blurb: "Invites and roles", permissions: ["tenant.users.view", "tenant.users.manage"] },
  { href: "/tenant-admin/roles", label: "Roles", shortLabel: "RO", blurb: "Access design", permissions: ["tenant.roles.view", "tenant.roles.manage"] },
  { href: "/tenant-admin/plan", label: "Plan", shortLabel: "PL", blurb: "Subscription", permissions: ["tenant.plan.view"] },
  { href: "/tenant-admin/setup", label: "Setup Guide", shortLabel: "SG", blurb: "Launch steps", permissions: ["tenant.setup.view"] },
  { href: "/tenant-admin/support-access", label: "Support Access", shortLabel: "SA", blurb: "Assisted operations", permissions: ["tenant.support_access.request", "tenant.support_access.approve"] },
  { href: "/tenant-admin/trust-audit", label: "Trust Audit", shortLabel: "TA", blurb: "Evidence review", permissions: ["tenant.audit.view", "tenant.audit.export"] },
  { href: "/tenant-admin/settings", label: "Settings", shortLabel: "ST", blurb: "Account controls", permissions: ["tenant.settings.view"] },
  { href: "/tenant-admin/security-readiness", label: "Security", shortLabel: "SE", blurb: "Enterprise readiness", permissions: ["tenant.security.view"] },
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
  const navItems = TENANT_ADMIN_NAV_ITEMS.filter((item) => sessionHasAnyPermission(sessionUser, item.permissions)).map(({ permissions, ...item }) => item);
  const quickLinks = TENANT_ADMIN_QUICK_LINKS.filter((item) => sessionHasAnyPermission(sessionUser, item.permissions)).map(({ permissions, ...item }) => item);

  return (
    <WorkspaceChrome
      footerDescription="Account setup, users, plan, support, security, and audit evidence in one focused workspace."
      navItems={navItems}
      productLabel="HRMS"
      quickLinks={quickLinks}
      roleLabel="Tenant Admin"
      searchHint="Search users, setup, audit..."
      userLabel={userLabel}
      workspaceLabel="Account Control Center"
      workspaceTone="admin"
    >
      {children}
    </WorkspaceChrome>
  );
}
