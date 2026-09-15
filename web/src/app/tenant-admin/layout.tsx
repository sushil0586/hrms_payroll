import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function TenantAdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireWorkspaceAccess({ workspace: "tenant_admin" });
  const userLabel =
    sessionUser?.display_name || sessionUser?.first_name || sessionUser?.username || null;

  return (
    <WorkspaceChrome
      footerDescription="Tenant account, seats, configuration posture, and commercial readiness in one focused workspace."
      navItems={[
        { href: "/tenant-admin", label: "Dashboard", shortLabel: "DB", blurb: "Account posture" },
        { href: "/tenant-admin/users", label: "User Management", shortLabel: "UM", blurb: "Invites and roles" },
        { href: "/tenant-admin/plan", label: "Plans & Subscription", shortLabel: "PL", blurb: "Billing posture" },
        { href: "/tenant-admin/setup", label: "Setup Guide", shortLabel: "SG", blurb: "Launch steps" },
        { href: "/tenant-admin/support-access", label: "Support Access", shortLabel: "SA", blurb: "Assisted operations" },
        { href: "/tenant-admin/trust-audit", label: "Audit Logs", shortLabel: "AU", blurb: "Evidence review" },
        { href: "/tenant-admin/settings", label: "Settings", shortLabel: "ST", blurb: "Account controls" },
        { href: "/tenant-admin/security-readiness", label: "Security", shortLabel: "SE", blurb: "Enterprise readiness" },
      ]}
      productLabel="HRMS"
      quickLinks={[
        { href: "/", label: "Home" },
        { href: "/tenant-admin", label: "Tenant" },
        { href: "/tenant-admin/setup", label: "Setup guide" },
        { href: "/tenant-admin/trust-audit", label: "Trust audit" },
        { href: "/tenant-admin/security-readiness", label: "Security" },
      ]}
      roleLabel="Tenant Admin"
      searchHint="Search users, plan, settings..."
      userLabel={userLabel}
      workspaceLabel="Account Control Center"
      workspaceTone="admin"
    >
      {children}
    </WorkspaceChrome>
  );
}
