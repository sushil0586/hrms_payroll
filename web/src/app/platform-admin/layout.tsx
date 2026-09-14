import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { requirePlatformAdminAccess } from "@/lib/workspace-access";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requirePlatformAdminAccess();
  const userLabel =
    sessionUser.display_name || sessionUser.first_name || sessionUser.username || null;

  return (
    <WorkspaceChrome
      footerDescription="Tenant onboarding, baseline governance, admin provisioning, and activation controls for SaaS operators."
      navItems={[
        { href: "/platform-admin", label: "Dashboard", shortLabel: "DB", blurb: "Action queue" },
        { href: "/platform-admin/leads", label: "Leads", shortLabel: "LD", blurb: "Signup requests" },
        { href: "/platform-admin/tenants", label: "Tenants", shortLabel: "TN", blurb: "Customer registry" },
        { href: "/platform-admin/onboarding", label: "Onboarding", shortLabel: "ON", blurb: "Activation gates" },
        { href: "/platform-admin/admins", label: "First Admins", shortLabel: "FA", blurb: "Login handoff" },
        { href: "/platform-admin/policy-packs", label: "Policy Packs", shortLabel: "PP", blurb: "Baseline adoption" },
        { href: "/platform-admin/audit-logs", label: "Audit Logs", shortLabel: "AU", blurb: "Handoff evidence" },
      ]}
      productLabel="HRMS"
      quickLinks={[
        { href: "/", label: "Home" },
        { href: "/platform-admin", label: "Tenants" },
        { href: "/platform-admin/policy-packs", label: "Packs" },
      ]}
      roleLabel="Platform Admin"
      searchHint="Search tenants, onboarding, baselines, and activation"
      userLabel={userLabel}
      workspaceLabel="Platform Control Center"
      workspaceTone="admin"
    >
      {children}
    </WorkspaceChrome>
  );
}
