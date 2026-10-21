import "./ess-experience.css";

import { WorkspaceHydrationBoundary } from "@/components/shell/workspace-hydration-boundary";
import { WorkspaceLoading } from "@/components/patterns/workspace-loading";
import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { getWorkspaceMenuSource } from "@/lib/ui/menu-catalog";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function EssLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireWorkspaceAccess({ workspace: "ess" });
  const userLabel =
    sessionUser?.display_name || sessionUser?.first_name || sessionUser?.username || null;
  const canAccessHrAdmin = Boolean(sessionUser?.workspace_access?.hr_admin);
  const canAccessMss = Boolean(sessionUser?.workspace_access?.mss);
  const fallbackNavItems = [
    { href: "/ess", label: "Overview", shortLabel: "OV", blurb: "Daily actions" },
    { href: "/ess/profile", label: "My Profile", shortLabel: "ME", blurb: "Employee information" },
    { href: "/ess/leave", label: "Leave", shortLabel: "LV", blurb: "Requests and balance" },
    { href: "/ess/attendance", label: "Attendance", shortLabel: "AT", blurb: "Daily and fixes" },
    { href: "/ess/documents", label: "Documents", shortLabel: "DO", blurb: "Required uploads" },
    { href: "/ess/payslips", label: "Payslips", shortLabel: "PS", blurb: "Payroll files" },
    { href: "/ess/statutory-declarations", label: "Statutory", shortLabel: "ST", blurb: "Tax declarations" },
    { href: "/ess/requests", label: "My Requests", shortLabel: "RQ", blurb: "Request history" },
    { href: "/ess/settings", label: "Settings", shortLabel: "SE", blurb: "Employee account" },
    { href: "/ess/notifications", label: "Inbox", shortLabel: "IN", blurb: "Alerts and updates" },
    ...(canAccessMss ? [{ href: "/mss/approvals", label: "Approvals", shortLabel: "AP", blurb: "Manager queue" }] : []),
  ];
  const fallbackQuickLinks = [
    { href: "/ess/leave", label: "Leave" },
    { href: "/ess/attendance", label: "Attendance" },
    { href: "/ess/payslips", label: "Payslips" },
    { href: "/ess/notifications", label: "Inbox" },
  ];
  const menuSource = await getWorkspaceMenuSource({
    workspace: "ess",
    sessionUser,
    fallbackGroups: [{ title: "Workspace", items: fallbackNavItems }],
    fallbackQuickLinks,
  });
  const quickLinks = [
    ...(canAccessHrAdmin ? [{ href: "/hr-admin", label: "HR Admin" }] : []),
    ...(canAccessMss ? [{ href: "/mss/approvals", label: "MSS" }] : []),
    { href: "/ess/profile", label: "My Profile" },
  ];

  return (
    <>
    <a className="ess-skip-link" href="#ess-content">Skip to employee content</a>
    <WorkspaceHydrationBoundary fallback={<WorkspaceLoading embedded label="Loading employee workspace" />} >
    <WorkspaceChrome
      appearance="accerio"
      documentNavigation
      prefetch={false}
      footerDescription="Your information, requests and employee services."
      navGroups={menuSource.navGroups}
      navItems={menuSource.navItems}
      productLabel="Accerio"
      quickLinks={quickLinks}
      roleLabel="Employee"
      searchHint="Find an employee service"
      userLabel={userLabel}
      workspaceLabel="Self service"
      workspaceTone="employee"
    >
      <div id="ess-content" tabIndex={-1}>{children}</div>
    </WorkspaceChrome>
    </WorkspaceHydrationBoundary>
    </>
  );
}
