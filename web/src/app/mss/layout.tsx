import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function MssLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireWorkspaceAccess({ workspace: "mss" });
  const userLabel =
    sessionUser?.display_name || sessionUser?.first_name || sessionUser?.username || null;

  return (
    <WorkspaceChrome
      footerDescription="Pending decisions, exceptions, and queue context for managers."
      navItems={[
        { href: "/mss/approvals", label: "Approvals", shortLabel: "AP", blurb: "Pending decisions" },
        { href: "/mss/notifications", label: "Notifications", shortLabel: "NT", blurb: "Manager alerts" },
        { href: "/ess", label: "Self service", shortLabel: "SS", blurb: "Personal view" },
      ]}
      productLabel="Nexora"
      quickLinks={[
        { href: "/ess", label: "ESS" },
        { href: "/ess/notifications", label: "Inbox" },
        { href: "/hr-admin", label: "HR Admin" },
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
