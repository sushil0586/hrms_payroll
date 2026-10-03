import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { getWorkspaceMenuSource } from "@/lib/ui/menu-catalog";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function MssLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireWorkspaceAccess({ workspace: "mss" });
  const userLabel =
    sessionUser?.display_name || sessionUser?.first_name || sessionUser?.username || null;
  const roleCodes = sessionUser?.default_membership?.role_codes ?? [];
  const canAccessHrAdmin = roleCodes.some((roleCode) => roleCode === "hr-admin" || roleCode.startsWith("hr-"));
  const menuSource = await getWorkspaceMenuSource({
    workspace: "mss",
    sessionUser,
    fallbackGroups: [
      {
        title: "Workspace",
        items: [
          { href: "/mss", label: "Dashboard", shortLabel: "DB", blurb: "Daily manager view" },
          { href: "/mss/approvals", label: "Approvals", shortLabel: "AP", blurb: "Pending decisions" },
          { href: "/mss/notifications", label: "Notifications", shortLabel: "NT", blurb: "Manager alerts" },
          { href: "/ess", label: "Self service", shortLabel: "SS", blurb: "Personal view" },
        ],
      },
    ],
    fallbackQuickLinks: [
      { href: "/ess", label: "ESS" },
      { href: "/ess/notifications", label: "Inbox" },
    ],
  });

  return (
    <WorkspaceChrome
      footerDescription="Pending decisions, exceptions, and queue context for managers."
      navGroups={menuSource.navGroups}
      navItems={menuSource.navItems}
      productLabel="Nexora"
      quickLinks={[
        ...menuSource.quickLinks,
        ...(canAccessHrAdmin ? [{ href: "/hr-admin", label: "HR Admin" }] : []),
      ]}
      roleLabel="Manager"
      searchHint="Search approvals, team requests, and exceptions"
      userLabel={userLabel}
      workspaceLabel="Manager inbox"
      workspaceTone="manager"
    >
      {children}
    </WorkspaceChrome>
  );
}
