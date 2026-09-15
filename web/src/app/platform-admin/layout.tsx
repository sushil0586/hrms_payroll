import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { requirePlatformAdminAccess } from "@/lib/workspace-access";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requirePlatformAdminAccess();
  const userLabel =
    sessionUser.display_name || sessionUser.first_name || sessionUser.username || null;

  return (
    <WorkspaceChrome
      footerDescription="Customer onboarding, setup templates, tenant admin users, and launch-readiness controls."
      navItems={[
        { href: "/platform-admin", label: "Dashboard", shortLabel: "DB", blurb: "Action queue" },
        { href: "/platform-admin/leads", label: "Leads", shortLabel: "LD", blurb: "Signup requests" },
        { href: "/platform-admin/tenants", label: "Tenants", shortLabel: "TN", blurb: "Customer registry" },
        { href: "/platform-admin/onboarding", label: "Launch Checklist", shortLabel: "LC", blurb: "Readiness gates" },
        { href: "/platform-admin/admins", label: "Tenant Admin Users", shortLabel: "TA", blurb: "Login access" },
        { href: "/platform-admin/policy-packs", label: "Setup Templates", shortLabel: "ST", blurb: "Default setup" },
        { href: "/platform-admin/audit-logs", label: "Audit Logs", shortLabel: "AU", blurb: "Action evidence" },
      ]}
      productLabel="HRMS"
      quickLinks={[
        { href: "/", label: "Home" },
        { href: "/platform-admin", label: "Tenants" },
        { href: "/platform-admin/policy-packs", label: "Templates" },
      ]}
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
