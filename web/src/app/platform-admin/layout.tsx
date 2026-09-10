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
        { href: "/platform-admin", label: "Tenants", shortLabel: "TN", blurb: "Onboarding pipeline" },
        { href: "/platform-admin?panel=policy-packs", label: "Policy Packs", shortLabel: "PP", blurb: "Baseline adoption" },
        { href: "/platform-admin?panel=events", label: "Events", shortLabel: "EV", blurb: "Handoff evidence" },
      ]}
      productLabel="Nexora"
      quickLinks={[
        { href: "/", label: "Home" },
        { href: "/platform-admin", label: "Tenants" },
        { href: "/platform-admin?panel=policy-packs", label: "Packs" },
      ]}
      roleLabel="Platform Admin"
      searchHint="Search tenants, onboarding, baselines, and activation"
      userLabel={userLabel}
      workspaceLabel="Platform console"
      workspaceTone="admin"
    >
      {children}
    </WorkspaceChrome>
  );
}
