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
        { href: "/tenant-admin", label: "Console", shortLabel: "CO", blurb: "Account posture" },
        { href: "/tenant-admin/trust-audit", label: "Trust Audit", shortLabel: "TA", blurb: "Evidence review" },
        { href: "/tenant-admin/security-readiness", label: "Security", shortLabel: "SE", blurb: "Enterprise readiness" },
      ]}
      productLabel="Nexora"
      quickLinks={[
        { href: "/", label: "Home" },
        { href: "/tenant-admin", label: "Tenant" },
        { href: "/tenant-admin/trust-audit", label: "Trust audit" },
        { href: "/tenant-admin/security-readiness", label: "Security" },
      ]}
      roleLabel="Tenant Admin"
      searchHint="Search account, plan, seats, and configuration"
      userLabel={userLabel}
      workspaceLabel="Tenant console"
      workspaceTone="admin"
    >
      {children}
    </WorkspaceChrome>
  );
}
