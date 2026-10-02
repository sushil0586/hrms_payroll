import { WorkspaceChrome } from "@/components/shell/workspace-chrome";
import { getWorkspaceMenuSource } from "@/lib/ui/menu-catalog";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export default async function EssLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireWorkspaceAccess({ workspace: "ess" });
  const userLabel =
    sessionUser?.display_name || sessionUser?.first_name || sessionUser?.username || null;
  const roleCodes = sessionUser?.default_membership?.role_codes ?? [];
  const canAccessHrAdmin = roleCodes.some((roleCode) => roleCode === "hr-admin" || roleCode.startsWith("hr-"));
  const canAccessMss = Boolean(sessionUser?.workspace_access?.mss);
  const fallbackNavItems = [
    { href: "/ess", label: "Overview", shortLabel: "OV", blurb: "Daily actions" },
    { href: "/ess/leave", label: "Leave", shortLabel: "LV", blurb: "Requests and balance" },
    { href: "/ess/attendance", label: "Attendance", shortLabel: "AT", blurb: "Daily and fixes" },
    { href: "/ess/documents", label: "Documents", shortLabel: "DO", blurb: "Required uploads" },
    { href: "/ess/payslips", label: "Payslips", shortLabel: "PS", blurb: "Payroll files" },
    { href: "/ess/statutory-declarations", label: "Statutory", shortLabel: "ST", blurb: "Tax declarations" },
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
    ...menuSource.quickLinks,
  ];

  return (
    <WorkspaceChrome
      footerDescription="Personal requests, attendance, and balances with a softer self-service flow."
      navGroups={menuSource.navGroups}
      navItems={menuSource.navItems}
      productLabel="Nexora"
      quickLinks={quickLinks}
      roleLabel="Employee"
      searchHint="Search leave, attendance, and request history"
      userLabel={userLabel}
      workspaceLabel="Self service"
      workspaceTone="employee"
    >
      {children}
    </WorkspaceChrome>
  );
}
